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
bool flipServo[] = { true, true, false, false};
int servoPins[] =          {  5, 6, 10, 11 };
int servoTargetVals[] =    {  179,  179,  1, 1 };
int servoVals[] =          {  1,  1,  1, 1 };
int servoStepDelays[] =    {  0,  0,  0, 0 };
int servoStepSizes[] =     {  1,  1,  1, 1 };
long nextServoUpdate[] =   {  0,  0,  0, 0 };

Servo servos[4];

void setup() {
  Serial.begin(9600);
  for(int i=0; i<nServos; i++) {
    servos[i].attach(servoPins[i]);
  }
    Serial.println("Start");
}

void loop() {
  
  delay(2000);
  
  Serial.println("up");
  
  for(int x=0; x<180; x += 1) {
    for(int i=0; i<nServos; i++) {
      servos[i].write(x);
    }
    //delay(10);
  }
  
  delay(2000);
  
  Serial.println("down");
  
  for(int x=180; x>0; x -= 1) {
    for(int i=0; i<nServos; i++) {
      servos[i].write(x);
    }
   // delay(10);
  }
  
  
}
