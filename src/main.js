import * as BABYLON from "@babylonjs/core";

const BAUD_RATE = 9600;
const ui = Object.fromEntries([
  "conectar", "iniciar", "parar", "porta", "modo", "estado",
  "confirmado", "frequencia", "intervalo", "intervaloValor", "log"
].map(id => [id, document.getElementById(id)]));
const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

let portaSerial = null;
let writer = null;
let reader = null;
let temporizadorEnvio = null;

function material(scene, nome, cor, emissiva = false) {
  const mat = new BABYLON.StandardMaterial(nome, scene);
  mat.diffuseColor = BABYLON.Color3.FromHexString(cor);
  if (emissiva) mat.emissiveColor = BABYLON.Color3.FromHexString(cor);
  return mat;
}

function criarCena() {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = BABYLON.Color4.FromHexString("#08131dff");
  const camera = new BABYLON.ArcRotateCamera("camera", -1.25, 1.05, 8, new BABYLON.Vector3(0, .4, 0), scene);
  camera.attachControl(canvas, true);
  new BABYLON.HemisphericLight("luz", new BABYLON.Vector3(0, 1, 0), scene).intensity = .95;

  const placa = BABYLON.MeshBuilder.CreateBox("arduino", { width: 3.7, height: .18, depth: 2.45 }, scene);
  placa.material = material(scene, "placa", "#176ba5");
  const usb = BABYLON.MeshBuilder.CreateBox("usb", { width: .85, height: .38, depth: .7 }, scene);
  usb.position.set(-1.78, .3, .55);
  usb.material = material(scene, "metal", "#aeb8c0");
  const chip = BABYLON.MeshBuilder.CreateBox("chip", { width: 1.15, height: .2, depth: .58 }, scene);
  chip.position.set(.15, .23, 0);
  chip.material = material(scene, "chipMat", "#1d252b");
  const led = BABYLON.MeshBuilder.CreateSphere("led", { diameter: .36 }, scene);
  led.position.set(1.18, .38, -.56);
  const apagado = material(scene, "apagado", "#35433d");
  const aceso = material(scene, "aceso", "#42ff78", true);
  led.material = apagado;
  const piso = BABYLON.MeshBuilder.CreateGround("piso", { width: 12, height: 9 }, scene);
  piso.position.y = -.15;
  piso.material = material(scene, "piso", "#1b2c3a");
  return { scene, led, apagado, aceso };
}

const modelo = criarCena();

function mensagem(texto, classe = "") {
  ui.log.textContent = texto;
  ui.log.className = classe;
}

function definirControles(conectado) {
  ui.intervalo.disabled = !conectado;
  ui.iniciar.disabled = !conectado;
  ui.parar.disabled = !conectado;
  ui.conectar.disabled = conectado;
  ui.conectar.textContent = conectado ? "ARDUINO CONECTADO" : "CONECTAR ARDUINO";
}

function exibirPeriodo(valor) {
  ui.intervaloValor.textContent = `${valor} ms`;
  ui.frequencia.textContent = `${(1000 / valor).toFixed(2).replace(".", ",")} Hz`;
}

async function enviar(comando) {
  if (!writer) {
    mensagem("Conecte o Arduino antes de enviar comandos.", "erro");
    return;
  }
  try {
    await writer.write(new TextEncoder().encode(`${comando}\n`));
  } catch (erro) {
    mensagem(`Falha no envio: ${erro.message}`, "erro");
  }
}

function processar(linha) {
  if (linha === "PRONTO") {
    mensagem("Arduino pronto para o comissionamento.", "ok");
  } else if (linha.startsWith("INTERVALO:")) {
    const valor = Number(linha.slice(10));
    if (!Number.isInteger(valor) || valor < 100 || valor > 1000) return;
    ui.intervalo.value = valor;
    ui.confirmado.textContent = `${valor} ms`;
    exibirPeriodo(valor);
    mensagem(`Arduino confirmou o período de ${valor} ms.`, "ok");
  } else if (linha === "LED:PISCANDO") {
    ui.modo.textContent = "PISCANDO";
    mensagem("Arduino confirmou: pisca-pisca em execução.", "ok");
  } else if (linha === "LED:PARADO") {
    ui.modo.textContent = "PARADO";
    mensagem("Arduino confirmou: pisca-pisca parado.", "alerta");
  } else if (linha === "ESTADO:1") {
    ui.estado.textContent = "ACESO";
    modelo.led.material = modelo.aceso;
  } else if (linha === "ESTADO:0") {
    ui.estado.textContent = "APAGADO";
    modelo.led.material = modelo.apagado;
  } else if (linha.startsWith("ERRO:")) {
    mensagem(`Arduino recusou o comando: ${linha}`, "erro");
  }
}

async function lerArduino() {
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (portaSerial?.readable) {
      reader = portaSerial.readable.getReader();
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const linhas = buffer.split(/\r?\n/);
          buffer = linhas.pop() ?? "";
          linhas.map(linha => linha.trim()).filter(Boolean).forEach(processar);
        }
      } finally {
        reader.releaseLock();
        reader = null;
      }
    }
  } catch (erro) {
    mensagem(`Comunicação interrompida: ${erro.message}`, "erro");
    ui.porta.textContent = "DESCONECTADA";
    ui.porta.className = "valor alerta";
    definirControles(false);
  }
}

async function conectarArduino() {
  if (!("serial" in navigator)) {
    mensagem("Web Serial indisponível. Use Chrome ou Edge no computador.", "erro");
    return;
  }
  try {
    portaSerial = await navigator.serial.requestPort();
    await portaSerial.open({ baudRate: BAUD_RATE });
    writer = portaSerial.writable.getWriter();
    ui.porta.textContent = "CONECTADA";
    ui.porta.className = "valor ok";
    definirControles(true);
    mensagem("Porta aberta. Aguardando as confirmações da placa.", "ok");
    lerArduino();
  } catch (erro) {
    mensagem(`Conexão não realizada: ${erro.message}`, "erro");
  }
}

ui.conectar.addEventListener("click", conectarArduino);
ui.iniciar.addEventListener("click", () => enviar("B"));
ui.parar.addEventListener("click", () => enviar("P"));
ui.intervalo.addEventListener("input", () => {
  const valor = Number(ui.intervalo.value);
  exibirPeriodo(valor);
  clearTimeout(temporizadorEnvio);
  temporizadorEnvio = setTimeout(() => enviar(`T:${valor}`), 120);
});

definirControles(false);
exibirPeriodo(1000);
engine.runRenderLoop(() => modelo.scene.render());
window.addEventListener("resize", () => engine.resize());
