// 가속도 센서 X, Y 값을 BLE로 전송하는 예제
// Arduino Nano 33 BLE Sense Rev2
// 2025.01.XX

#include <ArduinoBLE.h>
#include <Arduino_LSM6DS3.h>

BLEService ledService("19B10000-E8F2-537E-4F6C-D104768A1214");  // BLE Service

// BLE Characteristic - read and writable by central (가속도 값 전송용)
BLECharacteristic accelCharacteristic("19B10001-E8F2-537E-4F6C-D104768A1214", BLERead | BLENotify, 2);

void setup() {
  Serial.begin(9600);
  //while (!Serial); //시리얼 준비될떄까지 대기 (배터리 사용시 없앰)

  // IMU 센서 초기화 (LSM6DS3)
  if (!IMU.begin()) {
    Serial.println("IMU 센서 초기화 실패!");
    while (1);
  }
  
  Serial.println("IMU 센서 초기화 완료");

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
  ledService.addCharacteristic(accelCharacteristic);

  // add service
  BLE.addService(ledService);

  // set the initial value for the characteristic:
  uint8_t initialValue[2] = {0, 0};
  accelCharacteristic.writeValue(initialValue, 2);

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
      // 가속도 센서 값 읽기
      float x, y, z;
      if (IMU.accelerationAvailable()) {
        IMU.readAcceleration(x, y, z);
        
        // X, Y 값을 -1.0 ~ 1.0 범위에서 0 ~ 255로 맵핑
        int xMapped = map(constrain(x * 100, -100, 100), -100, 100, 0, 255);
        int yMapped = map(constrain(y * 100, -100, 100), -100, 100, 0, 255);
        
        // BLE로 값 전송 (2바이트: X, Y)
        uint8_t accelData[2] = {(uint8_t)xMapped, (uint8_t)yMapped};
        accelCharacteristic.writeValue(accelData, 2);
        
        Serial.print("가속도 X: ");
        Serial.print(x);
        Serial.print(", Y: ");
        Serial.print(y);
        Serial.print(" -> 맵핑: X=");
        Serial.print(xMapped);
        Serial.print(", Y=");
        Serial.println(yMapped);
      }
      
      delay(50);  // 50ms마다 업데이트
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