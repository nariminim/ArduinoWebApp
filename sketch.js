// 소문자 (아두이노와 동일하게 입력)
const SERVICE_UUID = "19b10000-e8f2-537e-4f6c-d104768a1214"; 
const WRITE_UUID = "19b10001-e8f2-537e-4f6c-d104768a1214"; 
let writeChar, readChar, statusP, connectBtn, micBtn;
let micValue = 0;  // 마이크 값
let isMicActive = false;  // 마이크 활성화 상태
let readInterval = null;  // 값 읽기 인터벌

function setup() {
  createCanvas(windowWidth, windowHeight);

  // BLE 연결
  connectBtn = createButton("Scan & Connect");
  connectBtn.mousePressed(connectAny);
  connectBtn.size(120, 30);
  connectBtn.position(20, 40);

  statusP = createP("Status: Not connected");
  statusP.position(22, 60);

  // 마이크 시작 버튼
  micBtn = createButton("마이크 시작");
  micBtn.mousePressed(toggleMic);
  micBtn.size(120, 30);
  micBtn.position(20, 110);
  micBtn.attribute('disabled', 'true');  // 초기에는 비활성화
}

function draw() {
  background(240);
  
  // 마이크 값 텍스트로 표시
  fill(0);
  textSize(24);
  textAlign(CENTER);
  text("마이크 볼륨값: " + micValue, width / 2, height / 2);
  
  // 추가 정보 표시
  textSize(16);
  textAlign(LEFT);
  fill(100);
  text("상태: " + (isMicActive ? "마이크 활성화됨" : "마이크 비활성화됨"), 20, 160);
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
    
    // Write characteristic 가져오기
    writeChar = await service.getCharacteristic(WRITE_UUID);
    
    // Read characteristic 가져오기 (값을 받기 위해)
    readChar = await service.getCharacteristic(WRITE_UUID);
    
    statusP.html("Status: Connected to " + (device.name || "device"));
    
    // 마이크 버튼 활성화
    micBtn.removeAttribute('disabled');
    
    // 연결 해제 시 처리
    device.addEventListener('gattserverdisconnected', () => {
      statusP.html("Status: Disconnected");
      micBtn.attribute('disabled', 'true');
      if (readInterval) {
        clearInterval(readInterval);
        readInterval = null;
      }
      isMicActive = false;
      micValue = 0;
    });
    
  } catch (e) {
    statusP.html("Status: Error - " + e);
    console.error(e);
  }
}

// ---- 마이크 시작/중지 토글 ----
async function toggleMic() {
  if (!writeChar || !readChar) {
    alert("먼저 블루투스를 연결해주세요.");
    return;
  }
  
  if (!isMicActive) {
    // 마이크 시작
    try {
      // 아두이노에 마이크 시작 신호 전송 (값 1)
      await writeChar.writeValue(new Uint8Array([1]));
      isMicActive = true;
      micBtn.html("마이크 중지");
      
      // 값을 주기적으로 읽기
      readInterval = setInterval(async () => {
        try {
          const value = await readChar.readValue();
          if (value && value.byteLength > 0) {
            micValue = value.getUint8(0);
          }
        } catch (e) {
          console.error("값 읽기 오류:", e);
        }
      }, 100);  // 100ms마다 읽기
      
    } catch (e) {
      console.error("마이크 시작 오류:", e);
      alert("마이크 시작 중 오류가 발생했습니다.");
    }
  } else {
    // 마이크 중지
    try {
      // 아두이노에 마이크 중지 신호 전송 (값 0)
      await writeChar.writeValue(new Uint8Array([0]));
      isMicActive = false;
      micBtn.html("마이크 시작");
      
      if (readInterval) {
        clearInterval(readInterval);
        readInterval = null;
      }
      micValue = 0;
    } catch (e) {
      console.error("마이크 중지 오류:", e);
    }
  }
}

