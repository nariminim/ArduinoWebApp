// 아두이노에서 위의 값을 128bit 로 만든 값을 입력. 아래. 
const SERVICE_UUID = '0000180a-0000-1000-8000-00805f9b34fb'; // 0x180A 확장형
const WRITE_UUID = '00002a57-0000-1000-8000-00805f9b34fb'; // 0x2A57 확장형
// const DEVICE_UUI = 'nano33blesense'장치 표시 이름(아두이노의 setLocalName과 일치)
// 이름이 너무 길거나(최대31바이트), 같은 장치의 이전 이름이 캐시로 남을 경우 못찾을 수도 있다...


// ===== OpenWeather API =====
//let url = 'https://api.openweathermap.org/data/2.5/weather?q=Seoul&appid=60f88595a9f4df871399482f2b5d8186&units=metric';

const API_KEY = '60f88595a9f4df871399482f2b5d8186';
let city = 'Seoul';

let writeChar, statusP, connectBtn, send1, send2, send3, fetchBtn, cityInput;
let lastWeather = '—';

function setup() {
  createCanvas(780, 230);
  textFont('monospace');

  statusP = createP('Status: Not connected');

  // BLE 연결
  connectBtn = createButton('🔗 Scan & Connect (acceptAllDevices)');
  connectBtn.mousePressed(connectAny);
  createSpan('&nbsp;');

  // 수동 전송(디버그용)
  send1 = createButton('Send 1'); send1.mousePressed(() => sendNumber(1));
  send2 = createButton('Send 2'); send2.mousePressed(() => sendNumber(2));
  send3 = createButton('Send 3'); send3.mousePressed(() => sendNumber(3));
  createSpan('&nbsp;&nbsp;');

  // 도시 입력 + 날씨 호출
  cityInput = createInput(city);
  cityInput.attribute('placeholder', 'e.g., Seoul, Tokyo, New York');
  cityInput.size(200);
  createSpan('&nbsp;');

  fetchBtn = createButton('🌤 Fetch Weather & Send');
  fetchBtn.mousePressed(() => {
    city = (cityInput.value() || 'Seoul').trim();
    fetchWeatherAndSend();
  });

  // Enter로도 실행
  cityInput.elt.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      city = (cityInput.value() || 'Seoul').trim();
      fetchWeatherAndSend();
    }
  });
}

function draw() {
  background(245);
  text('Open via https or http://localhost. Close other BLE apps before connecting.', 12, 50);
  text('Rule: temp <10°C → 1, 10–25°C → 2, >25°C → 3', 12, 70);
  text('City: ' + city, 12, 100);
  text('Last weather: ' + lastWeather, 12, 120, width-24);
}

// ---- BLE Connect ----
async function connectAny() {
  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [SERVICE_UUID]
    });
    const server  = await device.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    writeChar     = await service.getCharacteristic(WRITE_UUID);
    statusP.html('Status: Connected to ' + (device.name || 'device'));
  } catch (e) {
    statusP.html('Status: Error - ' + e);
    console.error(e);
  }
}

// ---- Write 1 byte to BLE ----
async function sendNumber(n) {
  if (!writeChar) { statusP.html('Status: Not connected'); return; }
  try {
    await writeChar.writeValue(new Uint8Array([n & 0xFF]));
    statusP.html('Status: Sent ' + n);
  } catch (e) {
    statusP.html('Status: Write error - ' + e);
  }
}

// ---- Fetch weather → decide 1/2/3 → send ----
async function fetchWeatherAndSend() {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
    statusP.html('Status: Fetching weather for ' + city + ' ...');
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    const temp = data?.main?.temp;               // °C
    const cond = (data?.weather?.[0]?.main || '').toString(); // e.g., Clear, Clouds, Rain
    lastWeather = `temp=${temp}°C, condition=${cond}`;

    // 온도만으로 결정 (구름/비 덮어쓰기 제거)
    let n = 3;
    if (temp < 10) n = 1;
    else if (temp <= 25) n = 2;
    else n = 3;

    await sendNumber(n);
  } catch (e) {
    statusP.html('Status: Weather error - ' + e);
    console.error(e);
  }
}