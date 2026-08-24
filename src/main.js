import * as BABYLON from "@babylonjs/core";
// ===================================================================
// PARÂMETROS QUE VOCÊ PODE ALTERAR NESTE ARQUIVO:
const INTERVALO_MS = 2000;
const VALOR_MIN = 20;
const VALOR_MAX = 90;
const LIMITE_ALARME = 75;
// ===================================================================
const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);
const painelValor = document.getElementById("valor");
const painelStatus = document.getElementById("status");
const painelEstado = document.getElementById("estado");
const painelContador = document.getElementById("contador");
const btnStart = document.getElementById("btnStart");
const btnStop = document.getElementById("btnStop");
const btnReset = document.getElementById("btnReset");
let rodando = false;
let intervaloId = null;
let contadorAlarmes = 0;
let matBarraRef = null;
let barraRef = null;
const createScene = function () {
const scene = new BABYLON.Scene(engine);
scene.clearColor = new BABYLON.Color4(0.09, 0.1, 0.15, 1);
const camera = new BABYLON.ArcRotateCamera(
"camera", -Math.PI / 2.3, Math.PI / 2.3, 5, new BABYLON.Vector3(0, 0.75, 0), scene
);
camera.attachControl(canvas, true);
const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
const base = BABYLON.MeshBuilder.CreateBox("base", { width: 1, height: 0.1, depth: 1 },
scene);
base.position.y = -0.05;
const barra = BABYLON.MeshBuilder.CreateBox("barra", { width: 0.4, height: 1, depth: 0.4 },
scene);
barra.setPivotPoint(new BABYLON.Vector3(0, -0.5, 0));
barra.position.y = 0;
const matBarra = new BABYLON.StandardMaterial("matBarra", scene);
matBarra.diffuseColor = new BABYLON.Color3(0.4, 0.4, 0.4);
barra.material = matBarra;
barraRef = barra;
matBarraRef = matBarra;
return scene;
};
function novaLeitura() {
const valor = VALOR_MIN + Math.random() * (VALOR_MAX - VALOR_MIN);
const alturaRelativa = (valor - VALOR_MIN) / (VALOR_MAX - VALOR_MIN);
barraRef.scaling.y = Math.max(0.05, alturaRelativa * 2);
const emAlarme = valor >= LIMITE_ALARME;
matBarraRef.diffuseColor = emAlarme
? new BABYLON.Color3(0.85, 0.2, 0.2)
: new BABYLON.Color3(0.2, 0.75, 0.35);
if (emAlarme) {
contadorAlarmes++;
painelContador.textContent = "Alarmes desde o último reset: " + contadorAlarmes;
}
painelValor.textContent = valor.toFixed(1);
painelStatus.textContent = emAlarme ? "ALARME — acima do limite" : "Normal";
painelStatus.style.color = emAlarme ? "#ff6b6b" : "#8be28b";
}
function atualizarBotoes() {
btnStart.disabled = rodando;
btnStop.disabled = !rodando;
btnReset.disabled = rodando; // RESET só funciona com o sistema PARADO
painelEstado.textContent = "Estado: " + (rodando ? "RODANDO" : "PARADO");
}
function iniciar() {
if (rodando) return;
rodando = true;
novaLeitura();
intervaloId = setInterval(novaLeitura, INTERVALO_MS);
atualizarBotoes();
}
function parar() {
if (!rodando) return;
rodando = false;
clearInterval(intervaloId);
atualizarBotoes();
}
function resetar() {
if (rodando) return; // intertravamento: não reseta com o sistema rodando
contadorAlarmes = 0;
painelContador.textContent = "Alarmes desde o último reset: 0";
}
btnStart.addEventListener("click", iniciar);
btnStop.addEventListener("click", parar);
btnReset.addEventListener("click", resetar);
const scene = createScene();
atualizarBotoes();
engine.runRenderLoop(function () {
scene.render();
});
window.addEventListener("resize", function () {
engine.resize();
});