#define trigPin1 13 // Hand
#define echoPin1 12
#define trigPin2 11 // Pillar_1
#define echoPin2 10
#define trigPin3 9 // Pillar_2
#define echoPin3 8

unsigned long last_reading_send;

void setup() {
  Serial.begin (9600);
  pinMode(trigPin1, OUTPUT); // Hand
  pinMode(echoPin1, INPUT);
  pinMode(trigPin2, OUTPUT); // Pillar_1
  pinMode(echoPin2, INPUT);
  pinMode(trigPin3, OUTPUT); // Pillar_2
  pinMode(echoPin3, INPUT);
  last_reading_send = millis();
}

long readDistance(int trigPin, int echoPin) {
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10); // Added this line
  digitalWrite(trigPin, LOW);  // Added this line
  long duration = pulseIn(echoPin, HIGH, 12000);
  long distance = (duration / 2) / 29.1;
  return distance;
}

void loop() {
  long distance1, distance2, distance3;

  distance1 = readDistance(trigPin1, echoPin1);
  distance2 = readDistance(trigPin2, echoPin2);
  distance3 = readDistance(trigPin3, echoPin3);

  if (millis() - last_reading_send >= 100 ) { // 1/10th second has passed
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

