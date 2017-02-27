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

byte buf[16];
int offset = 0;
bool headerRead;

int nServos = 4;
int servoPins[] =          {  5, 6, 10, 11 };
int servoTargetVals[] =    {  1,  1,  1, 1 };
int servoVals[] =          {  0,  0,  0, 0 };
int servoStepDelays[] =    {  0,  0,  0, 0 };
int servoStepSizes[] =     {  1,  1,  1, 1 };
long nextServoUpdate[] =   {  0,  0,  0, 0 };

Servo servos[4];

void setup() {
  Serial.begin(9600);
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
  
    if (offset > 2 && buf[offset-1] == 0 && buf[offset-2] == 0  && buf[offset-3] == 0) {
      headerRead = true; offset = 0;
    }
  
    if (headerRead && offset == 4) {
      int _servo = buf[0];
      int _val = buf[1];
      int _spd = buf[2];
      int _stp = buf[3];

      /* Debug
      Serial.println();
      Serial.print("Servo: "); Serial.print(_servo);
      Serial.print(" Val: "); Serial.print(_val);
      Serial.print(" Spd: "); Serial.print(_spd);
      Serial.println();
      */
      if (_servo <= nServos && _servo > 0) {
        servoTargetVals[_servo-1] = _val;
        servoStepDelays[_servo-1] = _spd;
        servoStepSizes[_servo-1] = _stp
        nextServoUpdate[_servo-1] = now + _spd;
      }
      headerRead = false; offset = 0;
    }
  }
  
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
}
