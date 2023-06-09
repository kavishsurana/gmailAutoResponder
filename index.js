require("dotenv").config();
const express = require("express");
const fs = require("fs");
const { google } = require("googleapis");
const nodemailer = require("nodemailer");

const app = express();
app.listen(8080, () => {
  console.log("Server is running...");
});

// Load the credentials from the .env file
const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, REFRESH_TOKEN } = process.env;

// Create an OAuth2 client using credentials
const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const checkForNewMessages = () => {
  console.log("Connected");
  //get message details
  const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
  gmail.users.messages.list(
    {
      userId: "me",
      q: `is:unread`,
    },
    async (err, res) => {
      if (err) return console.log("The API returned an error: " + err);

      const messages = res.data.messages;
      if (messages?.length) {
        console.log("New message received!");

        //checking if message unread
        for (const message of messages) {
          const messageDetails = await gmail.users.messages.get({
            userId: "me",
            id: message.id,
          });

          const threadId = messageDetails.data.threadId;
          const threadDetails = await gmail.users.threads.get({
            userId: "me",
            id: threadId,
          });
          console.log(res.data);
          const updatedGmailLabel = await gmail.users.messages.modify({
            userId: "me", // if user is authenticated
            id: message.id, // id of email
            resource: {
              addLabelIds: ["Label_2"],
            },
          });

          if (
            !threadDetails.data.messages.some(
              (msg) =>
                msg.labelIds.includes("SENT") &&
                msg.payload.headers.find(
                  (header) =>
                    header.name === "From" &&
                    header.value.includes("suranakavish@gmail.com")
                )
            )
          ) {
            console.log(
              `New email thread with subject "${
                messageDetails.data.payload.headers.find(
                  (header) => header.name === "Subject"
                ).value
              }" and thread ID ${threadId} received!`
            );

            // Sending a response to new unread Threads
            const transporter = nodemailer.createTransport({
              service: "gmail",
              auth: {
                type: "OAuth2",
                user: "suranakavish@gmail.com",
                clientId: process.env.CLIENT_ID,
                clientSecret: process.env.CLIENT_SECRET,
                refreshToken: process.env.REFRESH_TOKEN,
                accessToken: oAuth2Client.getAccessToken(),
              },
            });

            const mailOptions = {
              from: "suranakavish@gmail.com",
              to: messageDetails.data.payload.headers.find(
                (header) => header.name === "From"
              ).value,
              subject:
                "Re: " +
                messageDetails.data.payload.headers.find(
                  (header) => header.name === "Subject"
                ).value,
              text: "Thank you for your message. Yayyy ...I am on a vacation and will respond as soon as I am available",
            };

            transporter.sendMail(mailOptions, async (err, info) => {
              if (err) {
                console.log(err);
              } else {
                console.log(
                  `Automatic response sent to ${
                    messageDetails.data.payload.headers.find(
                      (header) => header.name === "From"
                    ).value
                  }: ${info.response}`
                );
                try {
                  updatedGmailLabel();
                  console.log("Label updated sucessfully")
                } catch (error) {
                  console.log("label catched")
                }
                
              }
            });
          } else {
            console.log(
              `Email thread with thread ID ${threadId} already has a reply from you.`
            );
          }
        }
      } else {
        console.log("No new messages.");
      }
    }
  );
};

function getRandomInterval() {
  const minInterval = 45000; // 45 seconds
  const maxInterval = 120000; // 120 seconds
  const randomDelay = Math.random() * (maxInterval - minInterval) + minInterval;
  return Math.floor(randomDelay);
}

function checkMessage() {
  // Schedule the next invocation
  const delay = getRandomInterval();
  setTimeout(function () {
    checkForNewMessages();
  }, delay);
}

// Start the initial invocation
checkMessage();