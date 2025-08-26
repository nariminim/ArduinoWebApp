// 아두이노에서 위의 값을 128bit 로 만든 값을 입력. 아래. 
const SERVICE_UUID = '0000180a-0000-1000-8000-00805f9b34fb'; // 0x180A 확장형
const WRITE_UUID = '00002a57-0000-1000-8000-00805f9b34fb'; // 0x2A57 확장형
// const DEVICE_UUI = 'nano33blesense'장치 표시 이름(아두이노의 setLocalName과 일치)
// 이름이 너무 길거나(최대31바이트), 같은 장치의 이전 이름이 캐시로 남을 경우 못찾을 수도 있다...
let writeChar, statusP, connectBtn, send1, send2, send3;

function setup() {
    createCanvas(600, 160); textFont('monospace');
    statusP = createP('Status: Not connected');
    connectBtn = createButton('🔎 Scan & Connect (acceptAllDevices)');
    connectBtn.mousePressed(connectAny);
    createSpan('&nbsp;');
    send1 = createButton('Send 1'); send1.mousePressed(() => sendNumber(1));
    send2 = createButton('Send 2'); send2.mousePressed(() => sendNumber(2));
    send3 = createButton('Send 3'); send3.mousePressed(() => sendNumber(3));
}
function draw() { 
    background(245); 
    text('Open via http://localhost (not file://). Close LightBlue first.', 12, 50); 
}

async function connectAny() {
    try {
        // ...그래서 acceptAllDevices: true 로 설정하여 모든 기기중 선택하도록. 
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
        await writeChar.writeValue(new Uint8Array([n & 0xFF])); // 숫자 1/2/3 한 바이트
        statusP.html('Status: Sent ' + n);
    } catch (e) { statusP.html('Status: Write error - ' + e); }
}