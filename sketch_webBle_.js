/* ====== 여기를 당신의 아두이노 코드와 '정확히' 맞추세요 ======
   - SERVICE_UUID: setAdvertisedService(...) 에서 쓴 서비스 UUID
   - WRITE_UUID  : BLEByteCharacteristic(..., BLEWrite) 의 UUID (웹→보드)
   * 예시에선 커스텀 128-bit UUID를 가정했습니다. */
  // const SERVICE_UUID = '180A';
// const WRITE_UUID   = '2A57';
// 아두이노에서 위의 값을 128bit 로 만든 값을 입력. 아래. 
const SERVICE_UUID = '0000180a-0000-1000-8000-00805f9b34fb';
const WRITE_UUID   = '0000180a-0000-1000-8000-00805f9b34fb';

// 장치 표시 이름(아두이노의 setLocalName과 일치하면 필터가 편합니다)
// 이름이 너무 길거나, 같은 장치의 이전 이름이 캐시로 남을 경우 못찾을 수도 있다. 

const DEVICE_NAME  = 'Nano33BLESense';

let writeChar = null;
let statusP, btnConnect, btn1, btn2, btn3;

function setup() {
  createCanvas(540, 260);
  textFont('monospace');

  statusP = createP('Status: Not connected');

  btnConnect = createButton('🔗 Connect BLE');
  btnConnect.mousePressed(connectBLE);

  createSpan('&nbsp;&nbsp;');
  btn1 = createButton('Send 1');
  btn2 = createButton('Send 2');
  btn3 = createButton('Send 3');

  btn1.mousePressed(() => sendNumber(1));
  btn2.mousePressed(() => sendNumber(2));
  btn3.mousePressed(() => sendNumber(3));
}

function draw() {
  background(245);
  fill(0);
  text('Press 1 / 2 / 3 buttons to write a single byte (1,2,3) to BLE characteristic.', 12, 50);
  text('Tip) UUID는 아두이노 스케치의 서비스/캐릭터리스틱과 정확히 일치해야 합니다.', 12, 70);
  text('If your sketch expects ASCII "1"/"2"/"3", use sendAscii() example in code.', 12, 90);
}

/* ---------- BLE 연결 ---------- */
async function connectBLE() {
  try {
    const device = await navigator.bluetooth.requestDevice({
      // 장치 이름 필터 사용(이름이 다르면 주석 처리하고 acceptAllDevices 사용)
      filters: [{ name: DEVICE_NAME }],
      optionalServices: [SERVICE_UUID]

      // ↓ 필터가 잘 안 잡히면 임시로 이렇게도 테스트 가능 (주석 해제하고 위 filters는 주석)
      // acceptAllDevices: true, optionalServices: [SERVICE_UUID]
    });
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    writeChar = await service.getCharacteristic(WRITE_UUID);

    statusP.html('Status: Connected to ' + (device.name || 'device'));
  } catch (err) {
    statusP.html('Status: Error - ' + err);
    console.error(err);
  }
}

/* ---------- 전송(숫자 바이트) ---------- */
/* 아두이노가 BLEByteCharacteristic(BLEWrite)로 '숫자 1/2/3'을 기대한다고 가정 */
async function sendNumber(n) {
  if (!writeChar) { statusP.html('Status: Not connected'); return; }
  try {
    // 단일 바이트(값 1/2/3)를 보냅니다.
    const data = new Uint8Array([n & 0xFF]);
    await writeChar.writeValue(data);
    statusP.html('Status: Sent number ' + n);
  } catch (err) {
    statusP.html('Status: Write error - ' + err);
  }
}

/* ---------- 전송(ASCII 문자) ----------
   만약 아두이노 스케치가 '문자 "1","2","3"'(아스키)로 받도록 짜여있다면 이걸 사용하세요.

async function sendAscii(ch) {
  if (!writeChar) { statusP.html('Status: Not connected'); return; }
  try {
    const enc = new TextEncoder();
    await writeChar.writeValue(enc.encode(ch)); // 예: '1'
    statusP.html('Status: Sent ASCII ' + ch);
  } catch (err) {
    statusP.html('Status: Write error - ' + err);
  }
}
// 사용 예: sendAscii('1');
*/
