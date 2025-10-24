import cv2
import mediapipe as mp
import numpy as np
import firebase_admin
from firebase_admin import credentials, db
import base64
import websockets
import asyncio
from io import BytesIO
from PIL import Image
import gc
import ssl

counter = 0
stage = 'up'
# Initializare Firebase
cred = credentials.Certificate('./project1---flexicoach-firebase-adminsdk-55x2z-2c174f1ff9.json') 
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://project1---flexicoach-default-rtdb.europe-west1.firebasedatabase.app'
})

db_ref = db.reference()

# Configurare MediaPipe
mp_drawing = mp.solutions.drawing_utils
mp_pose = mp.solutions.pose

# Functie pentru calcularea unghiurilor
def calculate_angle(a, b, c):
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)

    radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
    angle = np.abs(radians * 180.0 / np.pi)

    if angle > 180.0:
        angle = 360 - angle

    return angle

# Functie pentru obtinerea detaliilor unui exercitiu din Firebase
def get_exercise_details(exercise_name):
    ref = db.reference('videos')
    exercises = ref.order_by_child('name').equal_to(exercise_name).get()

    if exercises:
        key = list(exercises.keys())[0]
        return exercises[key]
    else:
        print(f"Exercițiul {exercise_name} nu a fost găsit în baza de date.")
        return None
    
last_sent_counter = None

# Procesare cadru primit prin WebSocket
async def process_frame(websocket, exercise_name, frame_data, state):
    global last_sent_counter
    exercise_details = get_exercise_details(exercise_name)
    
    if not exercise_details:
        await websocket.send(f"Exercițiul {exercise_name} nu a fost găsit.")
        return

    joints = exercise_details['joints']
    messages = exercise_details['messages']
    #messages_data = db_ref.child('messages').get()

    print(f"Joints: {joints}")
    angle_range = exercise_details['angle_range']

    # Decodificare imagine din base64
    try:
        img_data = base64.b64decode(frame_data)
        img_array = np.array(Image.open(BytesIO(img_data)).convert('RGB'))
        image = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
    except Exception as e:
        await websocket.send(f"Eroare la decodificarea imaginii: {e}")
        return


    # Afișează imaginea folosind OpenCV
    cv2.imshow("Imagine primita", image)
    cv2.waitKey(1)

    with mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5) as pose:
        print("Procesare imagine...")
        results = pose.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        
        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark
            
            coords = [
                [landmarks[getattr(mp_pose.PoseLandmark, joint).value].x, 
                 landmarks[getattr(mp_pose.PoseLandmark, joint).value].y]
                for joint in joints
            ]

            #PROCESARE MESAJ FEEDBACK
            for message in messages:  
                try:
                    if isinstance(message, dict):
                        message_joints = message['joints']
                        message_coords = [
                            [landmarks[getattr(mp_pose.PoseLandmark, joint).value].x, 
                            landmarks[getattr(mp_pose.PoseLandmark, joint).value].y]
                            for joint in message_joints
                        ]
                        
                        message_angle = calculate_angle(message_coords[0], message_coords[1], message_coords[2])
                        message_limit = message['limit']
                        message_info = message['message']

                        if message_limit.startswith('<'):
                            if message_angle < float(message_limit[1:]):
                               await websocket.send(f"FEEDBACK: {message_info}")
                        elif message_limit.startswith('>'):
                            if message_angle > float(message_limit[1:]):
                               await websocket.send(f"FEEDBACK: {message_info}")
                    else:
                        print(f"Mesajul nu este un dicționar valid: {message}")

                except Exception as e:
                    print(f"Eroare la procesarea mesajului: {e}")


            #PROCESARE PROGRES REPETITII
            angle = calculate_angle(coords[0], coords[1], coords[2])
            print (f"Coordonate: {coords[0]}")
            print(f"Unghi: {angle}")
            print(f"Unghiuri dorite: {angle_range['min']} - {angle_range['max']}")  

            buffer_zone = 5  
            if angle_range['max'] < angle_range['min']:
                if angle < angle_range['max'] + buffer_zone and state['stage'] == 'up':
                    state['stage'] = "down"
                    stage = "down"
                    state['counter'] += 1
                    print(f"Repetiție: {state['counter']}")
                elif angle > angle_range['min'] - buffer_zone and state['stage'] == 'down':
                    state['stage'] = "up"
                    stage = "up"
            else:
                if angle > angle_range['max'] - buffer_zone and state['stage'] == 'up':
                    state['stage'] = "down"
                    stage = "down"
                if angle < angle_range['min'] + buffer_zone and state['stage'] == 'down':
                    state['stage'] = "up"
                    stage = "up"
                    state['counter'] += 1
                    print(f"Repetiție: {state['counter']}")
                print("Stageeee: ", state['stage'])
           # Verificăm dacă numărul de repetări s-a schimbat înainte de a trimite
            if last_sent_counter != state['counter']:
                await websocket.send(f"{state['counter']}")
                last_sent_counter = state['counter']  
                print("AM TRIMIS")
        else:
            await websocket.send("Nu s-au detectat landmark-uri.")
    del img_array, image, results
    gc.collect()

# Functie de tratare a conexiunii WebSocket
async def handler(websocket):
    global counter, stage
    print("Conexiune WebSocket stabilită!")
    print("Stage: ", stage)
    print("Counter: ", counter)
    state = {'current_exercise': '', 'counter': counter, 'stage': stage}
    
    async for message in websocket:
        print(f"Mesaj primit!!!")
        print(f"Mesaj primit: {message[:50]}...")  
        exercise_name, sep, frame_data = message.partition('|')
        if not sep:
            await websocket.send("Formatul mesajului nu este corect. Foloseste 'exercitiu|cadru_base64'")
            continue
        print(f"Exercițiul: {exercise_name}")

        if exercise_name != state['current_exercise']:
            print(f"Schimbare exercițiu: {exercise_name}")
            state['current_exercise'] = exercise_name
            state['counter'] = 0
            counter = 0
            state['stage'] = 'up'
            stage = 'up'

        await process_frame(websocket, exercise_name, frame_data, state)

# Server WebSocket pentru primirea cadrelor si numelui exercitiului
async def websocket_server():
    print("Pornire server WebSocket pe ws://0.0.0.0:8765")

    try:
        server = await websockets.serve(handler, "0.0.0.0", 8765, max_size=5 * 1024 * 1024)
        print("Server WebSocket pornit la ws://0.0.0.0:8765")
        await server.wait_closed()

    except websockets.exceptions.ConnectionClosedError as e:
        print(f"Conexiune închisă neașteptat: {e}")
    except Exception as e:
        print(f"Eroare la pornirea serverului WebSocket: {e}")

# Pornire server WebSocket
if __name__ == "__main__":
    asyncio.run(websocket_server())
