# HackRU-F16
## Inspiration
Many patients forget to take their medication on time which may have adverse affects to their health. Other users may mix prescription and over the counter pills that may have conflicts and/or negate the effects and some may take the incorrect dosage or misread the information. 

## What it does
Our solution is a lambda function that allows users to talk to Amazon's Echo to schedule prescriptions into their daily lives, receive text notifications when the prescription should be taken, and can recall the information of the drugs, such as correct dosages, side effects, manufacturer, active/inactive ingredients, and conflicting medication. 

## How we built it
We used the Amazon Web Services to create a lamdba function. The function uses the Amazon Echo to listen for prescriptions and then based on the command, responds accordingly. The information for the drugs were taken from OpenFDA, a open source for most medication information [link](https://open.fda.gov). The text messages the user receives are created through the Twilio API. 

## Challenges we ran into
Working around lamdba's modified version of Node and the issues with connecting the Echo to our source code. 

## Accomplishments that we're proud of
Creating Med-Echo as an interactive solution was an accomplishment in and of itself. But creating a solution to empower the disabled, elderly, or forgetful was truly memorable. 

## What we learned
We learned the language that Amazon Echo speaks, a version of Node.js, and how to create lambda functions for the Echo. 

## What's next for Med-Echo
The future for Med-Echo is endless but the next logical step is to make medication scheduling and information as accessible and conversational as possible. This includes for those with disabilities that may limit their functions but not their voice, it helps empower those brave individuals. Another path would be to connect the medication to a user's iHealth or health devices. 

SLIDESHOW: https://docs.google.com/a/tcnj.edu/presentation/d/1-VsCwqO2f29wCRmSdeDOFg3Sgy9e5grn3m6EHUctSsc/edit?usp=sharing

DEVPOST: https://devpost.com/software/med-echo
