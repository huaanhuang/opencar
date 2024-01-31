import RPi.GPIO as GPIO

try:
    GPIO.cleanup()
except Exception as e:
    pass

EN1 = 22
IN1 = 16
IN2 = 18
EN2 = 15
IN3 = 11
IN4 = 13
tmp = 1

GPIO.setmode(GPIO.BOARD)
GPIO.setup(EN1, GPIO.OUT)
GPIO.setup(EN2, GPIO.OUT)
GPIO.setup(IN1, GPIO.OUT)
GPIO.setup(IN2, GPIO.OUT)
GPIO.setup(IN3, GPIO.OUT)
GPIO.setup(IN4, GPIO.OUT)
GPIO.output(IN1, GPIO.LOW)
GPIO.output(IN2, GPIO.LOW)
GPIO.output(IN3, GPIO.LOW)
GPIO.output(IN4, GPIO.LOW)

pwm1 = GPIO.PWM(EN1, 1000)
pwm2 = GPIO.PWM(EN2, 1000)

# pwm1.start(25)
pwm2.start(25)

try:
    while True:
        print("请输入命令: ")
        x = input()
        if x == "r":
            print("开始转....")
            if tmp == 1:
                GPIO.output(IN1, GPIO.HIGH)
                GPIO.output(IN2, GPIO.LOW)
                GPIO.output(IN3, GPIO.HIGH)
                GPIO.output(IN4, GPIO.LOW)
                print("向前转")
                x = "z"
            else:
                GPIO.output(IN1, GPIO.LOW)
                GPIO.output(IN2, GPIO.HIGH)
                GPIO.output(IN3, GPIO.LOW)
                GPIO.output(IN4, GPIO.HIGH)
                print("向后转")
                x = "z"
        elif x == "s":
            print("停止")
            GPIO.output(IN1, GPIO.LOW)
            GPIO.output(IN2, GPIO.LOW)
            GPIO.output(IN3, GPIO.LOW)
            GPIO.output(IN4, GPIO.LOW)
            x = "z"
        elif x == "f":
            print("向前转")
            GPIO.output(IN1, GPIO.HIGH)
            GPIO.output(IN2, GPIO.LOW)
            GPIO.output(IN3, GPIO.HIGH)
            GPIO.output(IN4, GPIO.LOW)
            tmp = 1
            x = "z"
        elif x == "b":
            print("向后转")
            GPIO.output(IN1, GPIO.LOW)
            GPIO.output(IN2, GPIO.HIGH)
            GPIO.output(IN3, GPIO.LOW)
            GPIO.output(IN4, GPIO.HIGH)
            tmp = 0
            x = "z"
        elif x == "l":
            print("低速")
            # pwm1.ChangeDutyCycle(25)
            pwm2.ChangeDutyCycle(25)
            x = "z"
        elif x == "m":
            print("中速")
            # pwm1.ChangeDutyCycle(50)
            pwm2.ChangeDutyCycle(50)
            x = "z"
        elif x == "h":
            print("高速")
            # pwm1.ChangeDutyCycle(75)
            pwm2.ChangeDutyCycle(75)
            x = "z"
        elif x == "e":
            GPIO.cleanup()
            print("GPIO clean up")
            break
        else:
            print("wrong data")

except KeyboardInterrupt:
    pass

# 停止 PWM
# pwm1.stop()
pwm2.stop()

# 清理 GPIO 设置
