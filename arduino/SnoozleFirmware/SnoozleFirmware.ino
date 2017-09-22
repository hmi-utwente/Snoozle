/*
 * Snoozle servo controller
 * 
 * Serial Protocol:                 0x00 0x00 0x00 0x01 0x5A 0x32
 *                                    ^^   ^^   ^^   ^^   ^^   ^^
 *     send a header =================""===""===""   ""   ""   ""
 * ...followed by a byte for the servo ==============""   ""   ""
 * ...followed by a byte for the angle value =============""   ""
 * ...followed by a byte for the delay between angle updates ==""
 * servo is the 0x01 first, 0x02 second, ... servo as defined
 *   in the servoPins array
 * angle value is a byte between 0x01 (1) and 0xB4 (180).
 * delay is a byte between 0x01 (1ms) and 0xff (255ms) for delays
 *   in ms between changing by 1 degree of rotation. 
 */
#include <Servo.h>

#define trigPin1 3 // Hand
#define echoPin1 4
#define trigPin2 8 // Pillar_1
#define echoPin2 9
#define trigPin3 12 // Pillar_2
#define echoPin3 13

unsigned long last_reading_send;

byte buf[16];
int offset = 0;
bool headerRead;

int nServos = 4;

// flip servo: do they go from 0-180 or from 180-0...
bool flipServo[] = { true, true, false, false};

// what digital pins are we connected to
int servoPins[] =          {  5, 6, 10, 11 };
int servoTargetVals[] =    {  179,  179,  1, 1 };
int servoVals[] =          {  1,  1,  1, 1 };
int servoStepDelays[] =    {  0,  0,  0, 0 };
int servoStepSizes[] =     {  1,  1,  1, 1 };
long nextServoUpdate[] =   {  0,  0,  0, 0 };

Servo servos[4];

void setup() {
  Serial.begin (9600);
  
  pinMode(trigPin1, OUTPUT); // Hand
  pinMode(echoPin1, INPUT);
  pinMode(trigPin2, OUTPUT); // Pillar_1
  pinMode(echoPin2, INPUT);
  pinMode(trigPin3, OUTPUT); // Pillar_2
  pinMode(echoPin3, INPUT);
  last_reading_send = millis();
  
  for(int i=0; i<nServos; i++) {
    servos[i].attach(servoPins[i]);
  }
  headerRead = false;
}


void loop() {
  long now = millis();

  if (Serial.available() > 0) {
    if (offset > 15) offset = 0;
    buf[offset] = Serial.read();
    offset++;

    // When three zero bytes are read, we are in sync with the sender => headerRead
    // The next four bytes are the values of a packet.
    if (offset > 2 && buf[offset-1] == 0 && buf[offset-2] == 0  && buf[offset-3] == 0) {
      headerRead = true; offset = 0;
    }

    // So, if headerRead, and 4 bytes after that were read, we have a packet.
    if (headerRead && offset == 4) {
      int _servo = buf[0];  // For this servo (0,1,2,3)
      int _val = buf[1];   // set a new target position (0-180)
      int _spd = buf[2];  // interpolate to that position from the current position, but wait &_spd ms between each step
      int _stp = buf[3]; // step size

      /* Debug */
      Serial.println();
      Serial.print("Servo: "); Serial.print(_servo);
      Serial.print(" Val: "); Serial.print(_val);
      Serial.print(" Spd: "); Serial.print(_spd);
      Serial.println();
      /**/
      if (_servo <= nServos && _servo > 0) {
        if (flipServo[_servo-1]) _val = 181-_val;
        _val = constrain(_val, 1, 179);
        servoTargetVals[_servo-1] = _val;
        servoStepDelays[_servo-1] = _spd;
        servoStepSizes[_servo-1] = _stp;
        nextServoUpdate[_servo-1] = now + _spd;
      }
      headerRead = false; offset = 0;
    }
  }

  //do the controlling servo stuff
  for(int i=0; i<nServos; i++) {
    if (now >= nextServoUpdate[i]) {
      if (servoVals[i] > servoTargetVals[i]) {
        servoVals[i] = servoVals[i]-servoStepSizes[i];
        if (servoVals[i] < servoTargetVals[i]) servoVals[i] = servoTargetVals[i];
      }
      else if (servoVals[i] < servoTargetVals[i]) {
        servoVals[i] = servoVals[i]+servoStepSizes[i];
        if (servoVals[i] > servoTargetVals[i]) servoVals[i] = servoTargetVals[i];
      }
      
      nextServoUpdate[i] = now + servoStepDelays[i];
      servos[i].write(servoVals[i]);
    }
  }

  //now do the sensing stuff :)
  if (millis() - last_reading_send >= 100 ) { // 1/10th second has passed
    
    long distance1, distance2, distance3;
  
    distance1 = readDistance(trigPin1, echoPin1);
    distance2 = readDistance(trigPin2, echoPin2);
    distance3 = readDistance(trigPin3, echoPin3);

    Serial.print("{ \"Hand\" : ");
    Serial.print(distance1);
    Serial.print(", \"Pillar_1\" : ");
    Serial.print(distance2);
    Serial.print(", \"Pillar_2\" : ");
    Serial.print(distance3);
    Serial.print("}\n");

    last_reading_send = millis();
  }
}


long readDistance(int trigPin, int echoPin) {
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10); // Added this line
  digitalWrite(trigPin, LOW);  // Added this line
  long duration = pulseIn(echoPin, HIGH, 12000);
  long distance = (duration / 2) / 29.1;
  return distance;
}

