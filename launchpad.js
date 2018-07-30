// require all libs 
const Discord = require('discord.js');
const axios = require('axios');
const readline = require('readline');
const http = require('http');

// create a new Discord client
const client = new Discord.Client();

// array to contain all channels that the bot a voice connection to
var connectedChannels = Array();

// when the client is ready, update activify feed
client.on('ready', () => {
    client.user.setActivity("Type $link to get to you upload page! Commands: $join, $leave, $<soundName>");
});

// handle a recived message
client.on('message', message => {
    processMessage(message);
});

// helper function to async handle the recived message
async function processMessage(message){
    // ignore everithing that doesn't start with '$'
    if(!message.content.startsWith("$")) return;

    // log the messages text for debug. TODO: replace with logfile
    console.log(message.content);

    // if join command -> join current voice channel of the user -> delete message with the command
    if (message.content.startsWith("$join")) {
        if (!message.guild) return;
        await joinChannel(message.member.voiceChannel, message.guild);    
        message.delete(1000);
        // all done. Skip rest of function
        return;
    }

    // if leave command -> leave the voicechannel of the server the message came from -> delete message with the command
    if (message.content.startsWith("$leave")) {
        // if direct message -> do nothing 
        // IMPORTANT or the bot will crash on DMs since they have no guild.
        if (!message.guild) return;
        leaveChannel(message.guild);
        message.delete(1000);
        // all done. Skip rest of function
        return;
    }

    // if link command -> respond with a link to the webinterface & serverID-> delete message with the command
    if (message.content.startsWith("$link")) {
        // if direct message -> do nothing 
        // IMPORTANT or the bot will crash on DMs since they have no guild.
        if (!message.guild) return;
        message.channel.send("http://discord.nitschke.website?server="+message.guild.id);
        message.delete(1000);
        // all done. Skip rest of function
        return;
    }

    // redundant if. Maybe playing sounds will get its own prefix. Then this can be used
    // TODO: move to playSound function.
    if (message.content.startsWith("$")) {

        // log that a sound command was issued. TODO: replace with logfile
        console.log("playing");
        
        var leaveAfter = false;
        var channel = getChannel(message.guild);

        // if the bot is not connected to any voicechannel of the server -> join the users channel -> play sound -> leave
        if(channel == null){
            channel = await joinChannel(message.member.voiceChannel, message.guild)    
            leaveAfter = true;
        }

        // only if connection was successfull
        if(channel == null)return;
        
        // get the link to the sound file from the server
        axios.get('http://discord.nitschke.website/getSound.php?name='+message.content.substring(1)+"&server="+message.guild.id)
          .then(response => {
            // if the bot is not playing on this server & the request was valid -> play the sound.
            if(channel.isTalking == false && response.data.length > 5){
                channel.isTalking = true;

                // log the sound link. TODO: replace with logfile
                console.log("playing :"+response.data);

                // play the sound at 10% volume.
                const dispatcher = channel.connection.playArbitraryInput(response.data,{ passes: 3});
                dispatcher.setVolume(0.1);
                dispatcher.on('end', () => {
                    // after the sound played -> check if channel should be left & delete the message
                    channel.isTalking = false;
                    if(leaveAfter) leaveChannel(message.guild);
                    message.delete(1000);
                });
            }else{
                // if the bot is allready playing or the server request had an issue -> deleate message and leave if needed
                message.delete(1000);
                if(leaveAfter) leaveChannel(message.guild);
            }
          })
        // catch http errors
          .catch(error => {
            console.log(error);
          });
    }
}

// Find any voice channel on a server that the bot is connected to. Return result or null
function getChannel(guild){
    // iterate all joined channels
    for (let index = 0; index < connectedChannels.length; index++) {
        const element = connectedChannels[index];
        if(element.guild.id == guild.id)
        return element;
    }
    return null;
}

// join a voice channel
function joinChannel(voiceChannel, guild){
  // input validation. Commend could come from someone that is not connected to a voice channel. This would result in the channel beeing null
  if (voiceChannel) {
   return voiceChannel.join()
    .then(conn=> { // Connection is an instance of VoiceConnection
        var channel =  {channel: voiceChannel, guild: guild, isTalking: false, connection: conn};
        connectedChannels.push(channel);
        return channel;
    })
    // log if anthing goes wrong. TODO: add logfile
    .catch(console.log);
  }
}

// leave the voice channel of a guild.
function leaveChannel(guild){
    // find the chanel struct with the correct guild
    for (let index = 0; index < connectedChannels.length; index++) {
        const element = connectedChannels[index];
        if(element.guild.id == guild.id){
            // remove it from the list
            connectedChannels.splice(index,1);
            // leave it
            element.connection.disconnect();
            // only possible to connect to one chanel per guild. No need to check the others
            return;
        }
    }

    // TODO: add logfile
    console.log("not connected to anything");
}

// using readline so the bot can be shut down via console
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  // await any user input
  rl.question('now Running', (answer) => {
    // close all
    console.log("bye");
    client.destroy();
    process.exit(-1);
    rl.close();
});


// login to Discord with app token from the env vars.
client.login(process.env.OPENSHIFT_BOTKEY);

// some hosts require the script to listen to a port of it will be closed (heroku). Prevent this.
http.createServer(function (request, response) {
    response.writeHead(404);
    response.end();

 }).listen(process.env.PORT);

// TODO: host the webinterface here, so only one server is requied.

