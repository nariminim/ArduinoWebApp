// 소문자 (아두이노와 동일하게 입력)
const SERVICE_UUID = "19b10000-e8f2-537e-4f6c-d104768a1214"; 
const WRITE_UUID = "19b10001-e8f2-537e-4f6c-d104768a1214"; 
let writeChar, statusP, connectBtn, sendBtn1, sendBtn2, sendBtn3;

// 가속도 센서 값
let accelX = 0, accelY = 0, accelZ = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);

  // BLE 연결
  connectBtn = createButton("Scan & Connect");
  connectBtn.mousePressed(connectAny);
  connectBtn.size(120, 30);
  connectBtn.position(20, 40);

  statusP = createP("Status: Not connected");
  statusP.position(22, 60);

  // Send 버튼들
  sendBtn1 = createButton("send 1");
  sendBtn1.mousePressed(() => sendNumber(1));
  sendBtn1.size(120, 30);
  sendBtn1.position(20, 100);

  sendBtn2 = createButton("send 2");
  sendBtn2.mousePressed(() => sendNumber(2));
  sendBtn2.size(120, 30);
  sendBtn2.position(20, 140);

  sendBtn3 = createButton("send 3");
  sendBtn3.mousePressed(() => sendNumber(3));
  sendBtn3.size(120, 30);
  sendBtn3.position(20, 180);

  // 가속도 센서 이벤트 리스너
  if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
    // iOS 13+ 권한 요청 필요
    DeviceMotionEvent.requestPermission()
      .then(response => {
        if (response == 'granted') {
          window.addEventListener('devicemotion', handleMotion);
        }
      })
      .catch(console.error);
  } else {
    // 다른 브라우저에서는 직접 리스너 추가
    window.addEventListener('devicemotion', handleMotion);
  }
}

function draw() {
  background(240);
  
  // 가속도 센서 값 텍스트로 출력
  fill(0);
  textSize(16);
  textAlign(LEFT);
  
  let startY = 250;
  text("가속도 센서:", 20, startY);
  text("X: " + accelX.toFixed(2), 20, startY + 30);
  text("Y: " + accelY.toFixed(2), 20, startY + 60);
  text("Z: " + accelZ.toFixed(2), 20, startY + 90);
}

// ---- BLE Connect ----
async function connectAny() {
  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [SERVICE_UUID],
    });
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    writeChar = await service.getCharacteristic(WRITE_UUID);
    statusP.html("Status: Connected to " + (device.name || "device"));
  } catch (e) {
    statusP.html("Status: Error - " + e);
    console.error(e);
  }
}

// ---- 가속도 센서 이벤트 핸들러 ----
function handleMotion(event) {
  if (event.accelerationIncludingGravity) {
    accelX = event.accelerationIncludingGravity.x || 0;
    accelY = event.accelerationIncludingGravity.y || 0;
    accelZ = event.accelerationIncludingGravity.z || 0;
  } else if (event.acceleration) {
    accelX = event.acceleration.x || 0;
    accelY = event.acceleration.y || 0;
    accelZ = event.acceleration.z || 0;
  }
}

// ---- Write 1 byte to BLE ----
async function sendNumber(n) {
  if (!writeChar) {
    statusP.html("Status: Not connected");
    return;
  }
  try {
    await writeChar.writeValue(new Uint8Array([n & 0xff]));
    statusP.html("Status: Sent " + n);
  } catch (e) {
    statusP.html("Status: Write error - " + e);
  }
}
