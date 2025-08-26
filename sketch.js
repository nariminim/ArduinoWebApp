// 아두이노에서 위의 값을 128bit 로 만든 값을 입력. 아래. 
const SERVICE_UUID = '0000180a-0000-1000-8000-00805f9b34fb'; // 0x180A 확장형
const WRITE_UUID = '00002a57-0000-1000-8000-00805f9b34fb'; // 0x2A57 확장형
// const DEVICE_UUI = 'nano33blesense'장치 표시 이름(아두이노의 setLocalName과 일치)
// 이름이 너무 길거나(최대31바이트), 같은 장치의 이전 이름이 캐시로 남을 경우 못찾을 수도 있다...

let writeChar, statusP, connectBtn, send1, send2, send3, motionBtn;
let motionOn = false;
let lastSent = 0;
const SEND_INTERVAL_MS = 200;  // 전송 최소 간격

function setup() {
  createCanvas(600, 180); textFont('monospace');
  statusP = createP('Status: Not connected');

  connectBtn = createButton('🔎 Scan & Connect (acceptAllDevices)');
  connectBtn.mousePressed(connectAny);
  createSpan('&nbsp;');

  send1 = createButton('Send 1'); send1.mousePressed(() => sendNumber(1));
  send2 = createButton('Send 2'); send2.mousePressed(() => sendNumber(2));
  send3 = createButton('Send 3'); send3.mousePressed(() => sendNumber(3));
  createSpan('&nbsp;&nbsp;');

  motionBtn = createButton('📱 Enable Motion Control');
  motionBtn.mousePressed(enableMotionControl);
}

function draw() {
  background(245);
  text('Open via https or http://localhost. Close other BLE apps (e.g., LightBlue).', 12, 50);
  text('Tilt phone: ax>+3 → 1, ax<-3 → 2, else → 3 (auto send every 200ms)', 12, 70);
}

async function connectAny() {
  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [SERVICE_UUID]
    });
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    writeChar = await service.getCharacteristic(WRITE_UUID);
    statusP.html('Status: Connected to ' + (device.name || 'device'));
  } catch (e) {
    statusP.html('Status: Error - ' + e);
    console.error(e);
  }
}

async function sendNumber(n) {
  if (!writeChar) { statusP.html('Status: Not connected'); return; }
  try {
    await writeChar.writeValue(new Uint8Array([n & 0xFF]));
    statusP.html('Status: Sent ' + n);
  } catch (e) { statusP.html('Status: Write error - ' + e); }
}

// === 핸드폰 센서 연동 ===
async function enableMotionControl() {
  try {
    // iOS(Bluefy 등) 권한 요청
    if (typeof DeviceMotionEvent !== 'undefined' &&
        typeof DeviceMotionEvent.requestPermission === 'function') {
      const perm = await DeviceMotionEvent.requestPermission();
      if (perm !== 'granted') { statusP.html('Status: Motion denied'); return; }
    }
    window.addEventListener('devicemotion', onMotion, { passive: true });
    motionOn = true;
    statusP.html('Status: Motion control enabled');
  } catch (e) {
    statusP.html('Status: Motion error - ' + e);
    console.error(e);
  }
}

function onMotion(e) {
  if (!motionOn || !writeChar) return;

  // 가속도(중력 포함) 사용: iOS/안드 공통 가용성 높음
  const acc = e.accelerationIncludingGravity || e.acceleration;
  if (!acc) return;

  const ax = acc.x || 0;  // 좌/우 기울기 지표로 사용
  const now = Date.now();
  if (now - lastSent < SEND_INTERVAL_MS) return;

  let n = 3;              // 기본 중립
  if (ax > 3) n = 1;      // 오른쪽으로 기울임
  else if (ax < -3) n = 2;// 왼쪽으로 기울임

  lastSent = now;
  sendNumber(n);
}