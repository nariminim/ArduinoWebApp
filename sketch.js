// 소문자 (아두이노와 동일하게 입력)
const SERVICE_UUID = "19b10000-e8f2-537e-4f6c-d104768a1214"; 
const WRITE_UUID = "19b10001-e8f2-537e-4f6c-d104768a1214"; 
let writeChar, statusP, connectBtn, sendBtn1, sendBtn2, sendBtn3, sensorBtn;
let cityInput, weatherBtn;  // 날씨 관련 UI 요소

// 가속도 센서 값
let accelX = 0, accelY = 0, accelZ = 0;
let sensorEnabled = false;
let sensorStatus = "센서 비활성화됨";

// 원의 물리적 속성
let ballX, ballY;  // 원의 위치
let ballVX = 0, ballVY = 0;  // 원의 속도
let ballRotation = 0;  // 원의 회전 각도
const ballDiameter = 20;
const ballRadius = ballDiameter / 2;
const friction = 0.95;  // 마찰 계수
const accelScale = 0.5;  // 가속도 스케일 조정

// 날씨 관련 변수
const OPENWEATHER_API_KEY = "60f88595a9f4df871399482f2b5d8186";
let currentTemperature = null;  // 현재 온도 (Celsius)
let weatherInfo = null;  // 날씨 정보 저장

function setup() {
  createCanvas(windowWidth, windowHeight);

  // 원을 캔버스 중앙에 초기화
  ballX = width / 2;
  ballY = height / 2;

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

  // 가속도 센서 활성화 버튼
  sensorBtn = createButton("가속도 센서 활성화");
  sensorBtn.mousePressed(enableSensor);
  sensorBtn.size(150, 30);
  sensorBtn.position(200, 100);

  // 날씨 관련 UI 요소 (캔버스 하단에 배치)
  cityInput = createInput();
  cityInput.attribute('placeholder', '도시 이름 입력');
  cityInput.position(20, height - 60);
  cityInput.size(200, 30);

  weatherBtn = createButton("날씨 가져오기");
  weatherBtn.mousePressed(getWeather);
  weatherBtn.size(150, 30);
  weatherBtn.position(240, height - 60);
}

function draw() {
  //background(240);
  
  // 가속도 센서가 활성화되어 있으면 원을 업데이트
  if (sensorEnabled) {
    updateBall();
  }
  
  // 원 그리기
  drawBall();
  
  // 가속도 센서 값 텍스트로 출력
  fill(0);
  textSize(16);
  textAlign(LEFT);
  
  let startY = 260;
  text("가속도 센서 상태: " + sensorStatus, 20, startY);
  text("가속도 센서:", 20, startY + 30);
  text("X: " + accelX.toFixed(2), 20, startY + 60);
  text("Y: " + accelY.toFixed(2), 20, startY + 90);
  text("Z: " + accelZ.toFixed(2), 20, startY + 120);
  
  // 날씨 정보 표시
  if (weatherInfo) {
    text("날씨 정보:", 20, startY + 150);
    text("온도: " + currentTemperature.toFixed(1) + "°C", 20, startY + 180);
    text("날씨: " + weatherInfo.description, 20, startY + 210);
  }
}

// ---- 원 업데이트 (물리 시뮬레이션) ----
function updateBall() {
  // 가속도 센서 값을 속도 변화로 변환
  // 센서값 X가 커지면 오른쪽으로, 센서값 Y가 커지면 위로 이동
  ballVX += accelX * accelScale;
  ballVY += -accelY * accelScale;
  
  // 마찰 적용
  ballVX *= friction;
  ballVY *= friction;
  
  // 속도가 매우 작으면 정지
  if (abs(ballVX) < 0.01) ballVX = 0;
  if (abs(ballVY) < 0.01) ballVY = 0;
  
  // 위치 업데이트
  ballX += ballVX;
  ballY += ballVY;
  
  // 캔버스 경계 처리 (튕기기)
  if (ballX < ballRadius) {
    ballX = ballRadius;
    ballVX *= -0.8;  // 반발 계수
  } else if (ballX > width - ballRadius) {
    ballX = width - ballRadius;
    ballVX *= -0.8;
  }
  
  if (ballY < ballRadius) {
    ballY = ballRadius;
    ballVY *= -0.8;
  } else if (ballY > height - ballRadius) {
    ballY = height - ballRadius;
    ballVY *= -0.8;
  }
  
  // 회전 각도 업데이트 (속도에 따라 회전)
  let rotationSpeed = sqrt(ballVX * ballVX + ballVY * ballVY) * 5;
  ballRotation += rotationSpeed;
}

// ---- 원 그리기 ----
function drawBall() {
  push();
  translate(ballX, ballY);
  rotate(ballRotation);
  
  // 온도에 따라 색상 결정
  let ballColor, strokeColor;
  if (currentTemperature === null) {
    // 날씨 정보가 없으면 기본 파란색
    ballColor = color(0, 100, 255);
    strokeColor = color(0, 50, 200);
  } else if (currentTemperature <= 10) {
    // 10도 이하면 파란색
    ballColor = color(0, 100, 255);
    strokeColor = color(0, 50, 200);
  } else if (currentTemperature <= 20) {
    // 10도~20도면 초록색
    ballColor = color(0, 200, 100);
    strokeColor = color(0, 150, 70);
  } else {
    // 20도 이상이면 빨간색
    ballColor = color(255, 0, 0);
    strokeColor = color(200, 0, 0);
  }
  
  fill(ballColor);
  stroke(strokeColor);
  strokeWeight(2);
  ellipse(0, 0, ballDiameter, ballDiameter);
  
  // 원의 방향을 표시하는 작은 선 추가 (기울임 확인용)
  stroke(255, 255, 255);
  strokeWeight(2);
  line(0, 0, ballRadius - 5, 0);
  
  pop();
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

// ---- 가속도 센서 활성화 ----
async function enableSensor() {
  if (sensorEnabled) {
    window.removeEventListener('devicemotion', handleMotion);
    sensorEnabled = false;
    sensorStatus = "센서 비활성화됨";
    sensorBtn.html("가속도 센서 활성화");
    return;
  }

  try {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      // iOS 13+ 권한 요청 필요 (사용자 제스처 후에만 가능)
      const response = await DeviceMotionEvent.requestPermission();
      if (response === 'granted') {
        window.addEventListener('devicemotion', handleMotion);
        sensorEnabled = true;
        sensorStatus = "센서 활성화됨";
        sensorBtn.html("가속도 센서 비활성화");
      } else {
        sensorStatus = "권한 거부됨";
        console.error('DeviceMotionEvent permission denied');
      }
    } else {
      // 다른 브라우저에서는 직접 리스너 추가
      window.addEventListener('devicemotion', handleMotion);
      sensorEnabled = true;
      sensorStatus = "센서 활성화됨";
      sensorBtn.html("가속도 센서 비활성화");
    }
  } catch (error) {
    sensorStatus = "오류: " + error.message;
    console.error('Error enabling sensor:', error);
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
  // 값이 업데이트되고 있는지 확인
  sensorStatus = "센서 작동 중 (값 업데이트됨)";
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

// ---- 날씨 가져오기 ----
async function getWeather() {
  const city = cityInput.value().trim();
  if (!city) {
    alert("도시 이름을 입력해주세요.");
    return;
  }
  
  try {
    // OpenWeatherMap API 호출
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=kr`;
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      if (response.status === 404) {
        alert("도시를 찾을 수 없습니다. 도시 이름을 확인해주세요.");
      } else if (response.status === 401) {
        alert("API 키 오류가 발생했습니다.");
      } else {
        alert("날씨 정보를 가져오는 중 오류가 발생했습니다. (상태 코드: " + response.status + ")");
      }
      return;
    }
    
    const data = await response.json();
    
    // 온도 및 날씨 정보 저장
    currentTemperature = data.main.temp;
    weatherInfo = {
      description: data.weather[0].description,
      city: data.name,
      country: data.sys.country
    };
    
    console.log("날씨 정보:", weatherInfo);
    console.log("온도:", currentTemperature);
    
    alert(`${weatherInfo.city}, ${weatherInfo.country}\n온도: ${currentTemperature.toFixed(1)}°C\n날씨: ${weatherInfo.description}`);
    
  } catch (error) {
    console.error("날씨 정보 가져오기 오류:", error);
    alert("날씨 정보를 가져오는 중 네트워크 오류가 발생했습니다.");
  }
}

// ---- 창 크기 변경 시 UI 요소 위치 조정 ----
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  
  // UI 요소 위치 재조정
  if (cityInput) {
    cityInput.position(20, height - 60);
  }
  if (weatherBtn) {
    weatherBtn.position(240, height - 60);
  }
}
