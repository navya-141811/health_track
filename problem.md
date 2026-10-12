Health Tracker :

My understanding and implementation plan ;

the caregivers will have to login into the software and have to connect to the device that the patient is wearing which has the data of values .then after the connection , the caregiver has to enter the name of the patient , and select the issues that the patient has like sugar , any heart issues , bp etc and there itself i need an optional question of threshold lets say  and then there is a graph of each value , and of course the live websocket it will update the graph and in the graph we should represent the hikes and abnormal points in different colours . we need two types of alerts one when the condition seems abnormal and one is the emergency case alert . when there is emergency case , i need a strong buzzer for caregiver , and for abnormal i thinkk a notification works , but we need to decide whether when to declare abnormal and emergency .

for the showcase , i am thinking of this :
first we already have a caregiver who is already connected to a patient and there are all statistics of graph and a list of emergency cases history , also having the live websocket connection and updatation . 
then we have a second caregiver who is new so they have to login , connect a device and monitoring just begins . 

and also during presenting the software to the judges we wanna show them all the cases like how the system will react a a abnormal situation and when the situation is emergency . that can be shown using specified data set but the thing we need to discuss is the constraints which decide the situation. 
