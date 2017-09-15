#define trigPin1 13
#define echoPin1 12
#define trigPin2 9
#define echoPin2 8

void setup() {
  Serial.begin (9600);
  pinMode(trigPin1, OUTPUT);
  pinMode(echoPin1, INPUT);
  pinMode(trigPin2, OUTPUT);
  pinMode(echoPin2, INPUT);
}

void loop() {
  long duration1, distance1, duration2, distance2;
  
  digitalWrite(trigPin1, HIGH);
  delayMicroseconds(10); // Added this line
  digitalWrite(trigPin1, LOW);  // Added this line
  duration1 = pulseIn(echoPin1, HIGH, 12000);
  distance1 = (duration1 / 2) / 29.1;
  
  digitalWrite(trigPin2, HIGH);
  delayMicroseconds(10); // Added this line
  digitalWrite(trigPin2, LOW);  // Added this line
  duration2 = pulseIn(echoPin2, HIGH, 12000);
  distance2 = (duration2 / 2) / 29.1;

  Serial.print(distance1);
  Serial.print("\t| ");
  Serial.println(distance2);
  
  delay(5);
}
