// 소문자 (아두이노와 동일하게 입력)
const SERVICE_UUID = "19b10000-e8f2-537e-4f6c-d104768a1214"; 
const WRITE_UUID = "19b10001-e8f2-537e-4f6c-d104768a1214"; 
let writeChar, readChar, statusP, connectBtn, sensorBtn;

// 아두이노 가속도 센서 값
let arduinoAccelX = 0, arduinoAccelY = 0;

// 핸드폰 가속도 센서 값
let phoneAccelX = 0, phoneAccelY = 0;
let sensorEnabled = false;
let sensorStatus = "센서 비활성화됨";

// Ball 클래스
class Ball {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 25;
    this.color = color;
    this.friction = 0.95;
    this.accelScale = 0.3;
  }
  
  update(accelX, accelY) {
    // 가속도 값을 속도 변화로 변환
    // 센서값 X가 커지면 오른쪽으로, 센서값 Y가 커지면 위로 이동
    // 0~255 범위를 -2.55~2.55 범위로 변환 (중앙값 127.5에서 차감)
    let normalizedX = (accelX - 127.5) / 50;
    let normalizedY = (accelY - 127.5) / 50;
    
    this.vx += normalizedX * this.accelScale;
    this.vy += -normalizedY * this.accelScale;
    
    // 마찰 적용
    this.vx *= this.friction;
    this.vy *= this.friction;
    
    // 속도가 매우 작으면 정지
    if (abs(this.vx) < 0.01) this.vx = 0;
    if (abs(this.vy) < 0.01) this.vy = 0;
    
    // 위치 업데이트
    this.x += this.vx;
    this.y += this.vy;
    
    // 캔버스 경계 처리 (튕기기)
    if (this.x < this.radius) {
      this.x = this.radius;
      this.vx *= -0.8;
    } else if (this.x > width - this.radius) {
      this.x = width - this.radius;
      this.vx *= -0.8;
    }
    
    if (this.y < this.radius) {
      this.y = this.radius;
      this.vy *= -0.8;
    } else if (this.y > height - this.radius) {
      this.y = height - this.radius;
      this.vy *= -0.8;
    }
  }
  
  display() {
    fill(this.color);
    stroke(0);
    strokeWeight(2);
    ellipse(this.x, this.y, this.radius * 2, this.radius * 2);
  }
}

// Ball 객체들
let ball;   // 아두이노 센서값에 반응
let ball2;  // 핸드폰 센서값에 반응
let readInterval = null;

function setup() {
  createCanvas(windowWidth, windowHeight);

  // BLE 연결
  connectBtn = createButton("Scan & Connect");
  connectBtn.mousePressed(connectAny);
  connectBtn.size(120, 30);
  connectBtn.position(20, 40);

  statusP = createP("Status: Not connected");
  statusP.position(22, 60);

  // 핸드폰 가속도 센서 활성화 버튼
  sensorBtn = createButton("핸드폰 센서 활성화");
  sensorBtn.mousePressed(enablePhoneSensor);
  sensorBtn.size(150, 30);
  sensorBtn.position(20, 100);

  // Ball 객체 생성
  ball = new Ball(width / 3, height / 2, color(255, 0, 0));  // 빨간색 - 아두이노
  ball2 = new Ball(width * 2 / 3, height / 2, color(0, 0, 255));  // 파란색 - 핸드폰
}

function draw() {
  background(240);
  
  // 아두이노 가속도 센서 값으로 ball 업데이트
  ball.update(arduinoAccelX, arduinoAccelY);
  ball.display();
  
  // 핸드폰 가속도 센서 값으로 ball2 업데이트
  if (sensorEnabled) {
    // 핸드폰 가속도 센서 값을 0~255 범위로 변환
    let phoneX = map(phoneAccelX, -10, 10, 0, 255);
    let phoneY = map(phoneAccelY, -10, 10, 0, 255);
    phoneX = constrain(phoneX, 0, 255);
    phoneY = constrain(phoneY, 0, 255);
    ball2.update(phoneX, phoneY);
  }
  ball2.display();
  
  // 정보 표시
  fill(0);
  textSize(16);
  textAlign(LEFT);
  text("아두이노 센서 (빨간 공)", 20, 140);
  text("X: " + arduinoAccelX.toFixed(0) + ", Y: " + arduinoAccelY.toFixed(0), 20, 160);
  
  text("핸드폰 센서 (파란 공): " + sensorStatus, 20, 200);
  if (sensorEnabled) {
    text("X: " + phoneAccelX.toFixed(2) + ", Y: " + phoneAccelY.toFixed(2), 20, 220);
  }
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
    
    // Read characteristic 가져오기 (가속도 값을 받기 위해)
    readChar = await service.getCharacteristic(WRITE_UUID);
    
    // Notification 시작
    await readChar.startNotifications();
    readChar.addEventListener('characteristicvaluechanged', handleArduinoAccel);
    
    statusP.html("Status: Connected to " + (device.name || "device"));
    
    // 연결 해제 시 처리
    device.addEventListener('gattserverdisconnected', () => {
      statusP.html("Status: Disconnected");
      arduinoAccelX = 0;
      arduinoAccelY = 0;
    });
    
  } catch (e) {
    statusP.html("Status: Error - " + e);
    console.error(e);
  }
}

// ---- 아두이노 가속도 센서 값 처리 ----
function handleArduinoAccel(event) {
  const value = event.target.value;
  if (value && value.byteLength >= 2) {
    arduinoAccelX = value.getUint8(0);
    arduinoAccelY = value.getUint8(1);
  }
}

// ---- 핸드폰 가속도 센서 활성화 ----
async function enablePhoneSensor() {
  if (sensorEnabled) {
    window.removeEventListener('devicemotion', handlePhoneMotion);
    sensorEnabled = false;
    sensorStatus = "센서 비활성화됨";
    sensorBtn.html("핸드폰 센서 활성화");
    phoneAccelX = 0;
    phoneAccelY = 0;
    return;
  }

  try {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      // iOS 13+ 권한 요청 필요
      const response = await DeviceMotionEvent.requestPermission();
      if (response === 'granted') {
        window.addEventListener('devicemotion', handlePhoneMotion);
        sensorEnabled = true;
        sensorStatus = "센서 활성화됨";
        sensorBtn.html("핸드폰 센서 비활성화");
      } else {
        sensorStatus = "권한 거부됨";
        console.error('DeviceMotionEvent permission denied');
      }
    } else {
      // 다른 브라우저에서는 직접 리스너 추가
      window.addEventListener('devicemotion', handlePhoneMotion);
      sensorEnabled = true;
      sensorStatus = "센서 활성화됨";
      sensorBtn.html("핸드폰 센서 비활성화");
    }
  } catch (error) {
    sensorStatus = "오류: " + error.message;
    console.error('Error enabling sensor:', error);
  }
}

// ---- 핸드폰 가속도 센서 이벤트 핸들러 ----
function handlePhoneMotion(event) {
  if (event.accelerationIncludingGravity) {
    phoneAccelX = event.accelerationIncludingGravity.x || 0;
    phoneAccelY = event.accelerationIncludingGravity.y || 0;
  } else if (event.acceleration) {
    phoneAccelX = event.acceleration.x || 0;
    phoneAccelY = event.acceleration.y || 0;
  }
  sensorStatus = "센서 작동 중";
}

// ---- 창 크기 변경 시 처리 ----
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // Ball 위치 재조정
  if (ball) {
    ball.x = width / 3;
    ball.y = height / 2;
  }
  if (ball2) {
    ball2.x = width * 2 / 3;
    ball2.y = height / 2;
  }
}
