import {Jerry} from "../main";
import {Message, Member, TextChannel} from "eris";
import {command} from "../Command";
import {ICommandContext} from "../types";
import { jerrys } from "../Commands/JerryPic";
//@ts-ignore
import globalModel from "../Models/Global"; 
const config = require('../../config.json'); 

class MessageCreateHandler{
    name: string;
    constructor(){
        this.name = "messageCreate";
    }
    


    async handle(this: Jerry, msg: Message): Promise<void> {
        const randomNumGenerator = Math.round(Math.random() * 220)
        let canPeckUsers = true;
        let canPeckServers = true;
        const data = await globalModel.findOne({}).exec();
        const array2 = (data as any)?.blacklistedPeckGuilds ?? ["264445053596991498"];
        if (array2.includes(msg.guildID!)){canPeckServers = false}
        //@ts-ignore
        if((randomNumGenerator === 25 || randomNumGenerator === 50 || randomNumGenerator === 75) && canPeckServers){msg.channel.createMessage(`GET PECKED ${msg.author.mention}!`)}
        handleCommand(msg, this);
    }
}


//finds the command object specified by the search
function findCommand(search: string, jerry: Jerry){
    return jerry.commands.find(com => (com.name === search) || (com.aliases.includes(search)));
}


function checkDev(member: Member){
    return config.owners.includes(member.id);
}


//check if the executing user is on the required user list
function checkRequiredUsers(member: Member, command: command){
    return command.requiredUsers.includes(member.id);
}


async function generalHelp(msg: Message, jerry: Jerry){
    const out = await commandList(jerry)
    let list: string[] = [];
    out.forEach(com =>{
        list.push(com.name)
    })
    const data = {
        embed: {
            color: 14460415,
            timestamp: new Date(),
            title: "Jerry's Commands",
            description: list.join(", ")
        }
    }
    return await msg.channel.createMessage(data);
}

async function commandHelp(msg: Message, command: command){
    const data = {
        embed: {
            description: `**Description:** ${command.helpInfo}\n**Aliases:** ${command.aliases.join(', ')}\n**Enabled:** ${command.alwaysEnabled}\n**Command Type:** ${command.commandType}`,
            color: 14460415,
            timestamp: new Date(),
            title: `Help for ${command.name}`
        }
    }
    return await msg.channel.createMessage(data);
}


//handles normal command execution
async function _commandHandler(msg: Message, label: string, args: Array<string>, jerry: Jerry){
    if(label === "help" && args.length === 0){
        return await generalHelp(msg, jerry);
    }
    if(label === "help" && args.length !== 0){
        const command = findCommand(args[0], jerry);
        if(!command){
            return;
        }
        return await commandHelp(msg, command);

    }
    const command = findCommand(label, jerry);
    if(!command){
        return "no command"
    }
    if(command.commandType === "dev"){
        if(!checkDev(msg.member!)){
            return "unauthorized: dev";
        }
    }

    if(command.requiredUsers.length !== 0){
        if(!checkRequiredUsers(msg.member!, command)){
            return "unauthorized: not a required user";
        }
    }
    if(!(msg.channel.type === 5 || msg.channel.type === 0)){return;}
    const ctx: ICommandContext = {
        msg: msg,
        channel: msg.channel,
        guild: msg.channel.guild,
        member: msg.member!,
        user: msg.author,
        content: msg.content,
        args: args,
        dev: false
    }

    //@ts-ignore
    await command.execute(jerry, ctx, false).catch((err: Error) => {
        console.log(command)
        jerry.logger.error("Jerry Error", `Command error from message ${msg.content} error: ${err}`);
    });
    






    //signale.error(`[Hyperion] command error on guild ${msg.channel.guild.id} from message ${msg.content}`);
    //signale.error(err);
    

}


//handles dev command execution
async function _devCommandHandler(msg: Message, label: string, args: Array<string>, jerry: Jerry){
    //@ts-ignore
    if(!msg.channel.guild){return;}
    //@ts-ignore
    if(!msg.channel.guild){return;}
    const command = findCommand(label, jerry);
    if(!command){
        return;
    }
    if(!(msg.channel.type === 5 || msg.channel.type === 0)){return;}
    const ctx: ICommandContext = {
        msg: msg,
        channel: msg.channel,
        guild: msg.channel.guild,
        member: msg.member!,
        user: msg.author,
        content: msg.content,
        args: args,
        dev: true
    }
    //@ts-ignore
    await command.execute(jerry, ctx, true).catch((err: Error) => {
        jerry.logger.error("Jerry Error", `command error from message ${msg.content}`);
        jerry.logger.error("Jerry Error", `${err}`);
    });
}

//main handler function
async function handleCommand(msg: Message, jerry: Jerry){
    if(msg.author.bot){
        return;
    }
    if(!_preHandle(msg, jerry)){
        return "invalid";
    }

    const result = await _prefixHandle(msg, jerry);
    if(result[0] === "none"){
        return;
    }

    if(result[0] === "dev"){
        //@ts-ignore
        return await _devCommandHandler(msg, result[1], result[2], jerry);
    }

    if(result[0] === "normal"){
        //@ts-ignore
        let out = await _commandHandler(msg, result[1], result[2], jerry);
        return;
    }

    return "no command";

}


//detect and isolate normal prefix and args
async function _prefixHandle(msg: Message, jerry: Jerry){

    //test for dev prefix and authorized user
    if((config.owners.includes(msg.author.id)) && (msg.content.toLowerCase().startsWith(config.devPrefix))){
        const args = msg.content.split(" ").slice(1);
        const cmdLabelar = msg.content.split(" ").slice(0, 1);
        const label = cmdLabelar[0].slice(config.devPrefix.length).toLowerCase();
        return ["dev", label, args];
    }

    //test for a guild's normal prefix
    if(msg.content.toLowerCase().startsWith(config.prefix)){
        const args = msg.content.split(" ").slice(3);
        const cmdLabelar = msg.content.split(" ").slice(2, 3);
        const label = cmdLabelar[0].trim().toLowerCase();
        return ["normal", label, args];
    }

    //test for mention prefix
    let contentClean = msg.content.replace(/<@!/g, "<@");
    if(contentClean.startsWith(jerry.user.mention)){
        const args = msg.content.split(" ").slice(2);
        const cmdLabelar = contentClean.split(" ").slice(1, 2);
        const label = cmdLabelar[0].trim().toLowerCase();
        return ["normal", label, args];
    }

    //no command prefix found, so no command will be checked for
    return ["none", null, null];
}





//checks that would stop immediately 
async function _preHandle(msg: Message, jerry: Jerry){
    if(msg.author.id === jerry.user.id){
        return false;
    }
    if(msg.member == null){
        return false;
    }
    if(msg.member.bot){
        return false;
    }
    return true;
}

function commandList(jerry: Jerry): Array<command>{
    let out = jerry.commands.filter(com => ((com.commandType !== "dev") && (com.commandType !== "internal") && (com.commandType !== "developer")));
    return out
}
export default new MessageCreateHandler;
