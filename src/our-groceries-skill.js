import AlexaSkill from './AlexaSkill';

class OurGroceriesSkill extends AlexaSkill {
  constructor(appId, ourGroceriesClient, ourGroceriesUserName, ourGroceriesPassword) {
    console.log("Loading skill...");
    super(appId);
    this.client = ourGroceriesClient;
    this.userName = ourGroceriesUserName;
    this.password = ourGroceriesPassword;
    if (!this.client) {
      throw "An OurGroceriesClient must be supplied";
    }

    this.eventHandlers = this.eventHandlers || {};
    this.eventHandlers.onLaunch = function(launchRequest, session, response) {
      var welcome  = "Welcome to Our Groceries for Echo." +
                     "You may add items to your Our Groceries lists just by asking Alexa. For example, say, Add apples to my Trader Joe's list."
        , reprompt = "Try it now, or say cancel.";                 

      response.ask(welcome, reprompt);
    }
  }
  
  AuthenticateAndGetLists(response, callback) {
    this.client.authenticate (this.userName, this.password, (authResult)=>{
        if (authResult.success) {
          this.client.getLists((listResult)=>{
            if (listResult.success) {
              this.lists = listResult.response.shoppingLists;
              callback(this.lists);
            } else {
              response.tell("I was unable to get your lists from Our Groceries");
            }
          });
        } else {
          response.tell("There was an error logging in. Visit the Our Groceries Alexa App to Auth");
        }
    });
  }

  AddItem(itemName, listName, quantity, intent, session, response) {
    quantity = quantity || 1;
    if (!itemName) {
      return response.ask("You didn't seem to specify what item you wanted to add to your list. Please try again. For example, add Apples to Trader Joe's list.");      
    } else if (!listName) {
      return response.ask("You didn't seem to specify which list you want to use. Please try again. For example, add Apples to Trader Joe's list.");      
    } else {
      this.AuthenticateAndGetLists(response, (lists) => {
        var list = this.FindList(listName, lists);
        if (list) {
          this.client.addToList(list.id, itemName, quantity, (addResult)=>{
            if (addResult.success) {
              response.tell("Ok, I've got it. "+itemName+" has been added to your "+list.name+" list");
            } else {
              response.tell("I'm sorry. There was an error adding that to your list");
            }
          });
        } else {
          response.tell("I was unable to find a list with the name " + listName+". You may add it in the Our Groceries app.");;
        }
      });      
    }
  }

  ListItemsOnList(listName, intent, session, response) {
    this.AuthenticateAndGetLists(response, (lists)=>{
      var list = this.FindList(listName, lists);
      if (list) {
        this.client.getList(list.id, (result) => {
          var tellResponse = `Here's what's on your ${result.response.list.name} list: ` + result.response.list.items.filter((item)=>{
            return !item.crossedOff;
          }).map((item)=>item.value).join(', ');
          response.tell(tellResponse);
        });
      } else {
        response.tell("I wasn't able to find that list.");
      }
    });
  }

  FindList(listName, allLists) {
    listName = listName.toLowerCase().replace(/\W/g, '');
    console.log(`Looking for ${listName}`);
    allLists = allLists.map((item) => {
      item.matchName = item.name.toLowerCase().replace(/\W/g, '');
      return item;
    });
    var candidates = allLists.filter((item) => item.matchName.indexOf(listName) === 0 || listName.indexOf(item.matchName) === 0);
    return candidates.length > 0 ? candidates[0] : null;
  }
}


OurGroceriesSkill.prototype.intentHandlers = {
  AddItem: function(intent, session, response) {
    var skill = new OurGroceriesSkill()
    var reprompt = "Say something like add apples to my trader joe's list";
    if (!intent.slots.itemName) {
      response.ask("It doesn't seem like you told me what item you want to add to the list", reprompt);
    } else if (!intent.slots.listName) {
      response.ask("It doesn't seem like you told me which list you want to use.", reprompt);
    } else {
      this.AddItem(intent.slots.itemName.value, intent.slots.listName.value, 1, intent, session, response);
    }
  },
  ListItems: function(intent, session, response) {
    if (!intent.slots.listName) {
      response.ask("You didn't specify the list you want to hear about. ","Say something like, What's on my Safeway list?");
    } else {
      this.ListItemsOnList(intent.slots.listName.value, intent, session, response);
    }
  }
}

module.exports = OurGroceriesSkill;
