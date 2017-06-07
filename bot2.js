var env = require('node-env-file');
env(__dirname + '/.env');


if (!process.env.page_token) {
    console.log('Error: Specify a Facebook page_token in environment.');
    usage_tip();
    process.exit(1);
}

if (!process.env.verify_token) {
    console.log('Error: Specify a Facebook verify_token in environment.');
    usage_tip();
    process.exit(1);
}

var Botkit = require('botkit');

// Create the Botkit controller, which controls all instances of the bot.
var controller = Botkit.facebookbot({
    debug: true,
    receive_via_postback: true,
    verify_token: process.env.verify_token,
    access_token: process.env.page_token,
    json_file_store: './Userdata.json'
});

var restaurantRes = {
    name :'',
    time :'' 
};

var bot = controller.spawn({
});

controller.setupWebserver(process.env.PORT, function(err, webserver) {
    controller.createWebhookEndpoints(webserver, bot, function() {
        console.log('ONLINE!');
    });
});

controller.hears(['hello', 'hi', 'hey'], 'message_received', function(bot, message) {
    controller.storage.users.get(message.user, function(err, user) {
        if (user && user.name) {
            bot.reply(message, 'Hello ' + user.name + '!!');
            controller.trigger('ask_question', [bot, message]);
        } else {
            bot.reply(message, 'Hello, What can i call you');
        }
    });
});

controller.hears(['call me (.*)', 'my name is (.*)'], 'message_received', function(bot, message) {
    var name = message.match[1];
    controller.storage.users.get(message.user, function(err, user) {
        if (!user) {
            user = {
                id: message.user,
            };
        }
        user.name = name;
        controller.storage.users.save(user, function(err, id) {
            bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.');
        });
    });
});

controller.on('ask_question', function(bot, message) {
    bot.startConversation(message, function(err,convo){
        if(!err){
            convo.ask("How can i help you today\n1. Reserve you a table\n2. Book you an airplane ticket", [
                {
                    pattern: "(.*) table",
                    callback: function(response , convo){
                        convo.next();
                        controller.trigger('reserve_table', [bot, message]);
                    }
                },
                {
                    pattern: "(.*) ticket",
                    callback: function(response , convo){
                        convo.next();
                        controller.trigger('book_ticket', [bot, message]);
                    }
                },
                {
                    default: true,
                    callback: function(response, convo) {
                        convo.say("Sorry did not get you there, please choose one of the two options")
                        convo.repeat();
                        convo.next();
                    }
                }
            ]);
        }
    });
});

controller.on('reserve_table', function(bot, message){
    bot.startConversation(message, function(err, convo){
        convo.ask("Where would you like to reserve a table", function(response , convo){
            convo.say("Your reservation at " +response.text+ " will be confirmed shortly");
        });
    })
});

controller.on('book_ticket', function(bot, message){
    bot.startConversation(message, function(err, convo){
        convo.ask("Which airline would you like to book a ticket from ", function(response , convo){
            convo.say("Your booking for " +response.text+ " will be confirmed shortly");
        });
    })
});