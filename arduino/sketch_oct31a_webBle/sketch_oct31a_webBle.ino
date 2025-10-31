// 마이크 볼륨값을 읽어서 BLE로 전송하는 예제
// 2025.01.XX

#include <ArduinoBLE.h>
#include <PDM.h>

BLEService ledService("19B10000-E8F2-537E-4F6C-D104768A1214");  // BLE Service

// BLE Characteristic - read and writable by central
BLEByteCharacteristic switchCharacteristic("19B10001-E8F2-537E-4F6C-D104768A1214", BLERead | BLEWrite);

// 마이크 관련 변수
static const char channels = 1;
static const int frequency = 16000;
short sampleBuffer[256];
volatile int samplesRead;
bool micActive = false;

// 볼륨 범위 설정
const int minVolume = 0;
const int maxVolume = 1000;  // 조정 가능

void onPDMdata() {
  int bytesAvailable = PDM.available();
  PDM.read(sampleBuffer, bytesAvailable);
  samplesRead = bytesAvailable / 2;
}

void setup() {
  Serial.begin(9600);
  //while (!Serial); //시리얼 준비될떄까지 대기 (배터리 사용시 없앰)

  // PDM 마이크 초기화
  PDM.onReceive(onPDMdata);
  if (!PDM.begin(channels, frequency)) {
    Serial.println("PDM 마이크 초기화 실패!");
    while (1);
  }

  // set LED's pin to output mode
  pinMode(LEDR, OUTPUT);
  pinMode(LEDG, OUTPUT);
  pinMode(LEDB, OUTPUT);
  pinMode(LED_BUILTIN, OUTPUT);

  digitalWrite(LED_BUILTIN, LOW);  // when the central disconnects, turn off the LED
  digitalWrite(LEDR, HIGH);        // will turn the LED off
  digitalWrite(LEDG, HIGH);        // will turn the LED off
  digitalWrite(LEDB, HIGH);        // will turn the LED off

  // begin initialization
  if (!BLE.begin()) {
    Serial.println("starting Bluetooth® Low Energy failed!");

    while (1)
      ;
  }

  // set advertised local name and service UUID:
  BLE.setLocalName("Nano33BLESense");
  BLE.setAdvertisedService(ledService);

  // add the characteristic to the service
  ledService.addCharacteristic(switchCharacteristic);

  // add service
  BLE.addService(ledService);

  // set the initial value for the characteristic:
  switchCharacteristic.writeValue(0);

  // start advertising
  BLE.advertise();

  Serial.println("BLE LED Peripheral");
}

void loop() {
  // listen for Bluetooth® Low Energy peripherals to connect:
  BLEDevice central = BLE.central();

  // if a central is connected to peripheral:
  if (central) {
    Serial.print("Connected to central: ");
    // print the central's MAC address:
    Serial.println(central.address());
    digitalWrite(LED_BUILTIN, HIGH);  // turn on the LED to indicate the connection

    // while the central is still connected to peripheral:
    while (central.connected()) {
      // 마이크 활성화 명령 수신 확인
      if (switchCharacteristic.written()) {
        byte value = switchCharacteristic.value();
        if (value == 1) {
          micActive = true;
          Serial.println("마이크 시작");
        } else if (value == 0) {
          micActive = false;
          Serial.println("마이크 중지");
        }
      }
      
      // 마이크가 활성화된 경우 볼륨값 읽기 및 전송
      if (micActive && samplesRead > 0) {
        // 볼륨값 계산 (RMS)
        long sum = 0;
        for (int i = 0; i < samplesRead; i++) {
          sum += abs(sampleBuffer[i]);
        }
        int volume = sum / samplesRead;
        
        // 0~255로 맵핑
        int mappedVolume = map(volume, minVolume, maxVolume, 0, 255);
        mappedVolume = constrain(mappedVolume, 0, 255);
        
        // BLE로 값 전송
        switchCharacteristic.writeValue((byte)mappedVolume);
        
        Serial.print("볼륨: ");
        Serial.print(volume);
        Serial.print(" -> 맵핑된 값: ");
        Serial.println(mappedVolume);
        
        samplesRead = 0;
      }
      
      delay(50);  // 약간의 딜레이
    }

    // when the central disconnects, print it out:
    Serial.print(F("Disconnected from central: "));
    Serial.println(central.address());
    digitalWrite(LED_BUILTIN, LOW);
    digitalWrite(LEDR, HIGH);    
    digitalWrite(LEDG, HIGH);    
    digitalWrite(LEDB, HIGH);    
  }
}