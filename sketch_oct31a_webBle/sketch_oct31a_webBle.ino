// LightBlue 앱 혹은 p5 > 008_bluetooth 코드와 함께 사용.
// 블루투스 기기를 선택하고, 1, 2, 3값을 전송해서 나노의 엘이디 제어하는 예제.
// 2025.08.26

#include <ArduinoBLE.h>

BLEService ledService("19B10000-E8F2-537E-4F6C-D104768A1214");  // BLE LED Service

// BLE LED Switch Characteristic - custom 128-bit UUID, read and writable by central
BLEByteCharacteristic switchCharacteristic("19B10001-E8F2-537E-4F6C-D104768A1214, BLERead | BLEWrite);

void setup() {
  Serial.begin(9600);
  //while (!Serial); //시리얼 준비될떄까지 대기 (배터리 사용시 없앰)

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
      // if the remote device wrote to the characteristic,
      // use the value to control the LED:
      if (switchCharacteristic.written()) {
        switch (switchCharacteristic.value()) {  // any value other than 0
          case 01:
            Serial.println("Blue LED on");
            digitalWrite(LEDR, HIGH);  // will turn the LED off
            digitalWrite(LEDG, HIGH);  // will turn the LED off
            digitalWrite(LEDB, LOW);   // will turn the LED on
            break;
          case 02:
            Serial.println("Green LED on");
            digitalWrite(LEDR, HIGH);  // will turn the LED off
            digitalWrite(LEDG, LOW);   // will turn the LED on
            digitalWrite(LEDB, HIGH);  // will turn the LED off
            break;
          case 03:
            Serial.println("Red LED on");
            digitalWrite(LEDR, LOW);   // will turn the LED on
            digitalWrite(LEDG, HIGH);  // will turn the LED off
            digitalWrite(LEDB, HIGH);  // will turn the LED off
            break;
          default:
            Serial.println(F("LEDs off"));
            digitalWrite(LEDR, HIGH);  // will turn the LED off
            digitalWrite(LEDG, HIGH);  // will turn the LED off
            digitalWrite(LEDB, HIGH);  // will turn the LED off
            break;
        }
      }
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