// require the discord.js module
const Discord = require('discord.js');
const readline = require('readline');
const axios = require('axios');

// create a new Discord client
const client = new Discord.Client();

var connectedChannels = Array();

// when the client is ready, run this code
// this event will trigger whenever your bot:
// - finishes logging in
// - reconnects after disconnecting
client.on('ready', () => {
    client.user.setActivity("Type $link to get to you upload page! Commands: $join, $leave, $<soundName>");
});
client.on('message', message => {
    processMessage(message);
});
async function processMessage(message){
    if(!message.content.startsWith("$")) return;
    console.log(message.content);
    if (message.content.startsWith("$join")) {
        if (!message.guild) return;
        await joinChannel(message.member.voiceChannel, message.guild);    
        message.delete(1000);
        return;
    }
    if (message.content.startsWith("$leave")) {
        if (!message.guild) return;
        leaveChannel(message.guild);
        message.delete(1000);
        return;
    }
    if (message.content.startsWith("$link")) {
        if (!message.guild) return;
        message.channel.send("http://discord.nitschke.website?server="+message.guild.id);
        message.delete(1000);
        return;
    }
    if (message.content.startsWith("$")) {
        console.log("playing");
        var leaveAfter = false;
        var channel = getChannel(message.guild);
        if(channel == null){
            channel = await joinChannel(message.member.voiceChannel, message.guild)    
            leaveAfter = true;
        }
        if(channel == null)return;
        axios.get('http://discord.nitschke.website/getSound.php?name='+message.content.substring(1)+"&server="+message.guild.id)
          .then(response => {
            if(channel.isTalking == false && response.data.length > 5){
                channel.isTalking = true;
                console.log("playing :"+response.data);
                const dispatcher = channel.connection.playArbitraryInput(response.data,{ passes: 3});
                dispatcher.setVolume(0.1);
                dispatcher.on('end', () => {
                    channel.isTalking = false;
                    if(leaveAfter) leaveChannel(message.guild);
                    message.delete(1000);
                });
            }else{
                message.delete(1000);
                if(leaveAfter) leaveChannel(message.guild);
            }
          })
          .catch(error => {
            console.log(error);
          });
    }
}

function getChannel(guild){
    for (let index = 0; index < connectedChannels.length; index++) {
        const element = connectedChannels[index];
        if(element.guild.id == guild.id)
        return element;
    }
    return null;
}

function joinChannel(voiceChannel, guild){
  // Only try to join the sender's voice channel if they are in one themselves
  if (voiceChannel) {
   return voiceChannel.join()
    .then(conn=> { // Connection is an instance of VoiceConnection
        var channel =  {channel: voiceChannel, guild: guild, isTalking: false, connection: conn};
        connectedChannels.push(channel);
        return channel;
    })
    .catch(console.log);
  }
}
function leaveChannel(guild){
    for (let index = 0; index < connectedChannels.length; index++) {
        const element = connectedChannels[index];
        if(element.guild.id == guild.id){
            connectedChannels.splice(index,1);
            element.connection.disconnect();
            return;
        }
    }
    console.log("not connected to anything");
}


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  

  rl.question('now Running', (answer) => {
    // TODO: Log the answer in a database
    console.log("bye");
    client.destroy();
    process.exit(-1);
    rl.close();
});


// login to Discord with your app's token
client.login(process.env.OPENSHIFT_BOTKEY);