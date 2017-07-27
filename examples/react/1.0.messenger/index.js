import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import { MonkeyUI, isConversationGroup } from 'react-monkey-ui'
import Monkey from 'monkey-sdk'
import * as vars from './utils/monkey-const.js'
import { applyMiddleware, createStore, compose } from 'redux'
import { reducer, actions } from 'redux-monkey-chat'

const monkey = new Monkey ();

const middlewares = [];
if (process.env.NODE_ENV === 'development') {
	const createLogger = require('redux-logger');
	const logger = createLogger();
	middlewares.push(logger);
}
const OFFLINE = 0;
const DISCONNECTED = 1;
const CONNECTING = 2;
const CONNECTED = 3;
const SYNCING = 4;
const MESSAGES_LOAD = 20;
const CONVERSATIONS_LOAD = 16;
const store = compose(applyMiddleware(...middlewares))(createStore)(reducer, {conversations: {}, users: {userSession: monkey.getUser()}});

const colorUsers = ["#6f067b","#00a49e","#b3007c","#b4d800","#e20068","#00b2eb","#ec870e","#84b0b9","#3a6a74","#bda700","#826aa9","#af402a","#733610","#020dd8","#7e6565","#cd7967","#fd78a7","#009f62","#336633","#e99c7a","#000000"];
var conversationSelectedId = 0;
var monkeyChatInstance;
var mky_focused = true;


/** functions set **/

var count=0;
var typing = false;
var timeout = undefined;

var unreadMessagesByConversation = { };

window.initChat = function(user){
	monkey.close();
	monkey.init(vars.MONKEY_APP_ID, vars.MONKEY_APP_KEY, user,null,false, vars.MONKEY_DEBUG_MODE, false,true,function(error,success){

		if(error){
			console.log(" Error :",JSON.stringify(error));
		}
	});
	render();
}

window.getMonkey = function(){
	return monkey;
}
/*****/

class MonkeyChat extends Component {
	constructor(props){
		super(props);
		this.state = {
			conversationId: undefined,
			viewLoading: false,
			conversationsLoading: true,
			panelParams : {},
			connectionStatus: 0,
			alternateConversations: null,
			isLoadingConversations: false
		}

		this.view = {
			type: 'rightside',
			data: {
				width: '350px',
				height: '100%'
			}
		}

		this.styles = {
			toggleColor: "rgb(225,79,80)",
			toggleTextColor: "rgb(255,255,255)",
			bubbleColorOut:'#ef404b',
			bubbleTextColorOut :'#FFFFFF',
			bubbleColorIn:'#e6e6e6',
			bubbleTextColorIn :'#666666',
			tabTextColor: "white"
		}

		this.handleUserSessionLogout = this.handleUserSessionLogout.bind(this);
		this.handleConversationOpened = this.handleConversationOpened.bind(this);
		this.handleConversationClosed = this.handleConversationClosed.bind(this);
		this.handleConversationLoadInfo = this.handleConversationLoadInfo.bind(this);
		this.handleConversationRemove = this.handleConversationRemove.bind(this);
		this.handleMessagesLoad = this.handleMessagesLoad.bind(this);
		this.handleMessage = this.handleMessage.bind(this);
		this.handleMessageDownloadData = this.handleMessageDownloadData.bind(this);
		this.handleMessageGetUser = this.handleMessageGetUser.bind(this);
		this.handleNotifyTyping = this.handleNotifyTyping.bind(this);
		this.handleLoadConversations = this.handleLoadConversations.bind(this);
		this.handleRenameGroup = this.handleRenameGroup.bind(this);
		this.handleMakeMemberAdmin = this.handleMakeMemberAdmin.bind(this);
		this.handleRemoveMember = this.handleRemoveMember.bind(this);
		/* Shippify handle */
		this.initConversation = this.initConversation.bind(this);
		this.handleConversationIdOpened = this.handleConversationIdOpened.bind(this);
		this.handleGroupInfo = this.handleGroupInfo.bind(this);


		/* Options */
		this.handleSearchUpdate = this.handleSearchUpdate.bind(this);

		this.handleSortConversations = this.handleSortConversations.bind(this);
		this.handleConversationDelete = this.handleConversationDelete.bind(this);

		this.handleReconnect = this.handleReconnect.bind(this);

		this.options = {
			conversation: {
				onSort: this.handleSortConversations,
				onSecondSort: this.handleSecondSortConversations,
				header1: 'Current Conversations',
				header2: 'New Conversations',
				optionsToDelete: {
					onExitGroup: undefined,
					onDelete: this.handleConversationDelete
				}
			},
			message: {
				optionsToIncoming: undefined,
				optionsToOutgoing: undefined
			}
		}
	}


	componentWillReceiveProps(nextProps) {
		if(nextProps.store.users.userSession && this.state.viewLoading){ // handle stop loading when found user session
			this.setState({viewLoading: false});
		}
	}

	render() {
		return (

			<MonkeyUI view={this.view}
			    styles={this.styles}
				options={this.options}
				viewLoading={this.state.viewLoading}
				conversationsLoading={this.state.conversationsLoading}
				userSession={this.props.store.users.userSession}
				onUserSessionLogout={this.handleUserSessionLogout}
				conversations={this.props.store.conversations}
				conversation={this.props.store.conversations[this.state.conversationId]}
				onConversationOpened={this.handleConversationOpened}
				onConversationClosed={this.handleConversationClosed}
				onConversationLoadInfo = {this.handleConversationLoadInfo}
				onMessagesLoad={this.handleMessagesLoad}
				onMessage={this.handleMessage}
				onMessageDownloadData={this.handleMessageDownloadData}
				onMessageGetUser={this.handleMessageGetUser}
				panelParams = {this.state.panelParams}
				asidePanelParams = {this.state.panelParams}
				onNotifyTyping = {this.handleNotifyTyping}
				onLoadMoreConversations = {this.handleLoadConversations}
				isLoadingConversations = {this.state.isLoadingConversations}
				connectionStatus = {this.state.connectionStatus}
				alternateConversations={this.state.alternateConversations}
				searchUpdated = {this.handleSearchUpdate}/>
		)
	}

	/* User */

	handleUserSessionLogout() {
		monkey.logout();
		store.dispatch(actions.deleteUserSession());
		store.dispatch(actions.deleteConversations());
	}

	/* Conversation */
	handleSortConversations(conversation1, conversation2) {
			let noLastMessage1, noLastMessage2;
		    if( !conversation1.messages || Object.keys(conversation1.messages).length == 0 || !conversation1.lastMessage || conversation1.messages[conversation1.lastMessage] == null )
		        noLastMessage1 = true;

		    if( !conversation2.messages || Object.keys(conversation2.messages).length == 0 || !conversation2.lastMessage || conversation2.messages[conversation2.lastMessage] == null )
		        noLastMessage2 = true;

		    if(noLastMessage1 && noLastMessage2){
		    	return conversation2.lastModified - conversation1.lastModified;
		    }else if(noLastMessage2){
		    	return conversation2.lastModified - Math.max(conversation1.messages[conversation1.lastMessage].datetimeCreation, conversation1.lastModified);
		    }else if(noLastMessage1){
		    	return Math.max(conversation2.messages[conversation2.lastMessage].datetimeCreation, conversation2.lastModified) - conversation1.lastModified;
		    }else{
		    	return Math.max(conversation2.messages[conversation2.lastMessage].datetimeCreation, conversation2.lastModified) - Math.max(conversation1.messages[conversation1.lastMessage].datetimeCreation, conversation1.lastModified);
			}
	}

	handleSecondSortConversations(conversation1, conversation2) {
		return conversation1.name.toLowerCase().localeCompare(conversation2.name.toLowerCase());
	}

	handleSearchUpdate(term){
		if(term != null && term.length > 0){

			var conversations = store.getState().conversations;

			if(window.searchChatCouriers){
				window.searchChatCouriers(conversations,term,searchUsersRemote=>{

						this.setState({ alternateConversations: searchUsersRemote });
				});
			}
			else{
				var searchUsers = {};
				var users = store.getState().users;

				Object.keys(users).forEach( (monkeyId) => {
					if(conversations[monkeyId] == null){
						var conversation = {
							id: monkeyId,
							name: users[monkeyId].name,
							urlAvatar: users[monkeyId].urlAvatar,
							messages: {},
							lastMessage: null,
							lastModified: -1,
							unreadMessageCounter: 0,
							description: null,
							loading: false
						}
						searchUsers[monkeyId] = conversation;
					}
				})

				this.setState({ alternateConversations: searchUsers });
			}


		}else{
			this.setState({ alternateConversations: null });
		}
	}


	handleConversationOpened(conversation) {

		if(!store.getState().conversations[conversation.id]){
			delete this.state.alternateConversations[conversation.id]
			createConversation(conversation.id, null);
		}

		monkey.sendOpenToUser(conversation.id);

		if(store.getState().conversations[conversation.id] && conversation.id != conversationSelectedId && store.getState().conversations[conversation.id].unreadMessageCounter != 0){
			const unread = store.getState().conversations[conversation.id].unreadMessageCounter;
			count = count - unread;
			setUnreadMessagesMainBadge(count);
			store.dispatch(actions.updateConversationUnreadCounter(conversation, 0));
		}

		this.setState({conversationId: conversation.id});
		conversationSelectedId = conversation.id;

		if(isConversationGroup(conversation.id)){
			//this.state.alternateConversations[conversation.id]
			//let members = listMembers(store.getState().conversations[conversationSelectedId].members);
			conversation['description'] = "Support with Shippify";
			store.dispatch(actions.updateConversationStatus(conversation));
		}
		if( (conversation.id).indexOf("shipsupp")>=0 ){
				window.postMessage({ type:"ShowShipperMap", conversation_id: conversation.id },'*');
		}

	}

	handleConversationClosed() {

		store.dispatch(actions.updateConversationUnreadCounter(store.getState().conversations[conversationSelectedId], 0));

		monkey.closeConversation(conversationSelectedId);
		this.setState({conversationId: 0});
		conversationSelectedId = 0;
	}

	handleConversationDelete(conversation, nextConversation, active, setConversationSelected) {
		monkey.deleteConversation(conversation.id, (err, data) => {
			if(!err){
				if(nextConversation){
					monkey.sendOpenToUser(nextConversation.id);
					if(active){
						this.setState({conversationId: nextConversation.id});
					}
				}else{
					if(active){
						this.setState({conversationId: undefined})
					}
				}
				store.dispatch(actions.deleteConversation(conversation));
			}
			setConversationSelected();
		});
		monkey.closeConversation(conversation.id);
	}

	handleLoadConversations(timestamp){
		loadConversations(timestamp/1000);
	}

	handleConversationLoadInfo(){
		var objectInfo = {};
		var userIsAdmin = false;
		objectInfo.users = [];
		let users = store.getState().users;
		let conversations = store.getState().conversations;
		let conversation = store.getState().conversations[conversationSelectedId];
		objectInfo.name = conversation.name;
		objectInfo.avatar = conversation.urlAvatar;
		if(isConversationGroup(conversationSelectedId)){
			conversation.members.forEach( (member) => {
				if(!member){
					return;
				}
				let user = users[member];
				if(typeof conversation.online == 'boolean'){
					if(!conversation.online){
						user.description = 'Offline';
					}
				}else{
					user.description = (conversation.online.indexOf(user.id) > -1 || users.userSession.id == user.id) ? 'Online' : 'Offline'
				}
				if(conversation.admin && conversation.admin.indexOf(user.id) > -1){
					user.rol = "Admin";
					if(user.id == users.userSession.id){
						userIsAdmin = true;
					}
				}else{
					user.rol = null;
				}
				objectInfo.users.push(user);
			})
			objectInfo.title = "Group Info";
			objectInfo.subTitle = "Participants";
			if(conversation.admin && conversation.admin.indexOf(users.userSession.id) > -1){
				objectInfo.actions = [
					{action : 'Delete Member', func : this.handleRemoveMember, confirm : true},
					{action : 'Make Admin', func : this.handleMakeMemberAdmin, confirm : true}
				]
				objectInfo.canAdd = false;
				objectInfo.renameGroup = this.handleRenameGroup;
			}
		}else{
			objectInfo.title = "User Info";
			objectInfo.subTitle = "Conversations With " + conversation.name;
			Object.keys(conversations).forEach(key => {
				if(conversations[key].members && conversations[key].members.indexOf(conversation.id) > -1){
					objectInfo.users.push({avatar : conversations[key].urlAvatar, name : conversations[key].name, description : conversations[key].members.length + " Loaded Messages"})
				}
			})
		}

		return objectInfo;
	}

	handleConversationRemove(conversationId) {
		let conversations = store.getState().conversations;
		let conversation = conversations[conversationId];

		if(conversationId == conversationSelectedId){
			var nextConversationId = 0;
			var conversationArray = this.createArray(conversations);
			for(var i = 0; i < conversationArray.length; i++){
				if(conversationArray[i].id == conversation.id){
					if(conversationArray[i+1]){
						nextConversationId = conversationArray[i+1].id
					}else if(conversationArray[i-1]){
						nextConversationId = conversationArray[i-1].id
					}
					break;
				}
			}
			monkey.openConversation(conversation.id);
			this.setState({conversationId: nextConversationId});
			conversationSelectedId = nextConversationId;
		}
		store.dispatch(actions.deleteConversation(conversation));
	}

	createArray(conversations) {
		let conversationarray = [];
		for(var x in conversations){
		  conversationarray.push(conversations[x]);
		}

		if(typeof this.options.conversationSort == "function"){
			conversationarray.sort(this.options.conversationSort);
		}
		return conversationarray;
	}

	handleRenameGroup(conversationId, newName){
		if(newName.length <= 3){
			return;
		}

		let conversation = store.getState().conversations[conversationId];
		if(!conversation){
			return;
		}

		monkey.editGroupInfo(conversation.id, {name : newName}, function(err, data){
			if(err){
				return;
			}
			store.dispatch(actions.updateConversationName(conversation,newName));
		});
	}

	handleRemoveMember(memberId, conversationId){
		monkey.removeMemberFromGroup(conversationId, memberId, null);
	}

	handleMakeMemberAdmin(memberId, conversationId){
		let conversation = store.getState().conversations[conversationId];
		if(!conversation || (conversation.admin && conversation.admin.indexOf(memberId) > -1)){
			return;
		}
		monkey.editGroupInfo(conversationId, {admin : conversation.admin + "," + memberId}, function(err, data){
			if(err){
				return;
			}

			store.dispatch(actions.updateConversationAdmin(conversation, data.admin));
		});
	}

	handleShowConversationsLoading(value){
		this.setState({conversationsLoading: value});
	}

	initConversation(shipper){

		const groupId = `G:${vars.MONKEY_APP_ID}-shipsupp:${shipper.id}`;
		const userId = store.getState().users.userSession.id;

		const conversation = store.getState().conversations[groupId];

		if( typeof conversation!=='undefined' && conversation!=null ){
			this.handleConversationIdOpened(groupId);
			return;
		}

		monkey.getInfoById( groupId, (error,groupInfo) => {
			if (error) {
				console.log(" Error getInfoById",error);
				return;
			}

			const shipper_info = groupInfo.members.filter( monkeyId => monkeyId==shipper.monkey_id );

			if(typeof groupInfo.members==null || groupInfo.members.length==0 || shipper_info.length==0){
				createShippifyGroup(shipper,(error,groupShippifyInfo) => {

					if(error){
						console.log(" Error to create Group")
						return;
					}

					monkey.getInfoById( groupId, (error,groupInfo) => {

						if(error){
							console.log(" Error after create group getInfoById",error);
							return;
						}

						this.handleGroupInfo(groupInfo,shipper);
						return;
					})
				})
			}else if(groupInfo.members.indexOf(userId)>-1){

				this.handleGroupInfo(groupInfo,shipper);
				return;
			}else{

				monkey.addMemberToGroup(groupId,userId,null,null,(err,_groupInfo) => {
					if(err){
						console.log(" Error addMemberToGroup:",err);
						return;
					}

					this.handleGroupInfo(_groupInfo,shipper);
					return;
				})
			}
		});
	}

	handleGroupInfo(groupInfo,shipper){

		const groupName = (groupInfo.info)? groupInfo.info.name :`Shippify - ${shipper.firstname} ${shipper.lastname}`;
		const avatar = (groupInfo.info)? groupInfo.info.avatar : null;

		const conversation = defineConversation(groupInfo.group_id, null, groupName, avatar, groupInfo.members_info, groupInfo.members);
		store.dispatch(actions.addConversation(conversation));
		this.handleConversationOpened(conversation);

	}

	handleConversationIdOpened(conversationId) {

		monkey.sendOpenToUser(conversationId);
		if(store.getState().conversations[conversationId] && conversationId != conversationSelectedId && store.getState().conversations[conversationId].unreadMessageCounter != 0){
			var conversation = store.getState().conversations[conversationId]
			store.dispatch(actions.updateConversationUnreadCounter(conversation, 0));
		}
		this.setState({conversationId: conversationId});
		conversationSelectedId = conversationId;
	}

	/* Message */

	handleMessage(message) {
		createMessage(message);
	}

	handleMessagesLoad(conversationId, firstMessageId) { // firstMessageId is now lastTimestamp

		let conversation = {
			id: conversationId,
			loading: true
		}
		store.dispatch(actions.updateConversationLoading(conversation));

		if(firstMessageId !=null){
			firstMessageId = firstMessageId / 1000 ;
		}

		monkey.getConversationMessages(conversationId, 10, firstMessageId, function(err, res){
			if(err){
	           console.log(err);
	        }else if(res){
		        if(res.length){
			     	let messages = {};
			     	let lastOpenMe = store.getState().conversations[conversationId].lastOpenMe;
					res.map( mokMessage => {
						let message = defineBubbleMessage(mokMessage);
						if(message) {
							// define status
							if(message.datetimeCreation <= lastOpenMe) {
								message.status = 52;
							}

							messages[message.id] = message;
						}
					});
					let conversation = {
						id: conversationId,
						loading: false
					}

					if(conversationSelectedId != conversationId){
						store.dispatch(actions.addMessages(conversation, messages, true));
					}else{
						store.dispatch(actions.addMessages(conversation, messages, false));
					}
		        }else{
			        let conversation = {
						id: conversationId,
						loading: false
					}
					store.dispatch(actions.updateConversationLoading(conversation));
		        }
			}
		});
	}

	handleMessageDownloadData(mokMessage){
		toDownloadMessageData(mokMessage);
	}

	handleMessageGetUser(userId){
		let user = store.getState().users[userId];
		if(!user){
			user = {};
		}
		let conversation = store.getState().conversations[conversationSelectedId];
		if(conversation && isConversationGroup(conversation.id)){
		 	var index = conversation.members.indexOf(userId);
		 	if(index >= 0){
	 			user.color = colorUsers[index%(colorUsers.length)];
		 	}else{
		 		user.color = '#8c8c8c'
		 	}
        }

		return user;
	}

	/* Notification */
	handleNotifyTyping(conversationId, isTyping){
		if(!isConversationGroup(conversationId)){
			monkey.sendTemporalNotification(conversationId, {type : isTyping ? 21 : 20}, null);
		}
	}

	handleReconnect(){
		if(monkey.status == DISCONNECTED){
			monkey.startConnection(store.getState().users.userSession.id);
		}
	}

}

function render() {
	monkeyChatInstance = ReactDOM.render(<MonkeyChat store={store.getState()}/>, document.getElementById('my-chat'));
	drawMainBadge()
}

store.subscribe(render);

window.onfocus = function(){
	mky_focused = true;

};
window.onblur = function(){
	mky_focused = false;

};

function initConversation(user_id){
	monkeyChatInstance.initConversation(user_id);
}

window.initConversation = initConversation;
// MonkeyKit

// --------------- ON CONNECT ----------------- //
monkey.on('Connect', function(event) {

	let user = event;
	if(!store.getState().users.userSession){
		user.id = event.monkeyId;
		user.urlAvatar = event.avatar;
		store.dispatch(actions.addUserSession(user));
	}else if(!store.getState().users.userSession.id){
		user.id = event.monkeyId;
		user.urlAvatar = event.avatar;
		store.dispatch(actions.addUserSession(user));
	}
	if(!Object.keys(store.getState().conversations).length){
		loadConversations(Date.now(),true);
	}else{
		monkey.getPendingMessages();
	}
	if(conversationSelectedId){
		monkey.openConversation(conversationSelectedId);
	}
});

// -------------- ON DISCONNECT --------------- //
monkey.on('Disconnect', function(event){

});

// --------------- ON MESSAGE ----------------- //
monkey.on('Message', function(mokMessage){

	count=count+1;
	//setUnreadMessagesMainBadge(count);
	defineMessage(mokMessage);
});

// --------------- ON MESSAGESYNC ----------------- //
monkey.on('MessageSync', function(mokMessage){

	defineMessage(mokMessage, true);
});


// -------------- ON STATUS CHANGE --------------- //
monkey.on('StatusChange', function(status){

	var params = {};
	var panelParams = {};

	switch(status){
		case OFFLINE:
			params = {backgroundColor : "red", color : 'white', show : true, message : "No Internet Connection"};
			break;
		case DISCONNECTED:
		    var reconnectDiv = <div style={{fontSize : '15px'}}>You Have a Session somewhere else! <span className="mky-connect-link" style={{cursor:'pointer',color:'red'}} onClick={ () => {monkey.startConnection()} } >Connect Here!</span></div>
			params = {backgroundColor : "black", color : 'white', show : true, message : reconnectDiv};
			break;
		case CONNECTING:
			params = {backgroundColor : "#FF9900", color : 'black', show : true, message : "Connecting..."};
			break;
		case CONNECTED:
			params = {backgroundColor : "#429A38", color : 'white', show : false, message : "Connected!!"};
			break;
		case SYNCING:
			params = {backgroundColor : "#ff7043", color : 'white', show : true, message : "Syncing...", fontSize : '15px'};
			break;
		default:
			params = {};
	}

	panelParams = params;

	try{
		monkeyChatInstance.setState({
			panelParams : panelParams,
			connectionStatus: status
		})
	}catch(exception){
		console.log("Error Monkey Chat Instance");
	}

});

// ------------- ON NOTIFICATION --------------- //
monkey.on('Notification', function(data){

	let paramsType = Number(data.params.type);
	let conversationId = data.senderId;
	if(!store.getState().conversations[conversationId]){
    	return;
	}
	switch(paramsType) {
		case 20: {
				let conversation = {
					id: conversationId,
					description: null
				}
				store.dispatch(actions.updateConversationStatus(conversation));
			break;
		}
		case 21: {
				let conversation = {
					id: conversationId,
					description: 'typing...'
				}
				store.dispatch(actions.updateConversationStatus(conversation));
			break;
		}
		default:
            break;
	}
});

// -------------- ON ACKNOWLEDGE --------------- //
monkey.on('Acknowledge', function(data){

	let conversationId = data.senderId;
	if(!store.getState().conversations[conversationId])
    	return;

	let message = {
		id: data.newId,
		oldId: data.oldId,
		status: Number(data.status),
		recipientId: data.recipientId
	}

	message.status = isConversationGroup(conversationId) ? 50 : Number(data.status);
	store.dispatch(actions.updateMessageStatus(message, conversationId));
});

// ------- ON CONVERSATION OPEN RESPONSE ------- //
monkey.on('ConversationOpenResponse', function(data){

	let conversationId = conversationSelectedId;
	if(!store.getState().conversations[conversationId])
		return;

	let conversation = {
		id: conversationId,
		online: data.online
	}
	// define lastOpenMe
	if(data.lastOpenMe){
		conversation.lastOpenMe = Number(data.lastOpenMe)*1000;
	}
	// define lastSeen
	if(data.lastSeen){
		conversation.lastSeen = Number(data.lastSeen)*1000;
	}

	store.dispatch(actions.updateConversationStatus(conversation));
	store.dispatch(actions.updateMessagesStatus(52, conversationId, true));
});

// ------------ ON CONVERSATION OPEN ----------- //
monkey.on('ConversationOpen', function(data){

	let conversationId = data.senderId;
	if(!store.getState().conversations[conversationId])
		return;

	store.dispatch(actions.updateMessagesStatus(52, conversationId, false));
});



monkey.on('GroupCreate',function(data){
})

// -------------- ON GROUP REMOVE -------------- //
monkey.on('GroupRemove', function(data){

	if(store.getState().conversations[data.id]){
		if(data.member != store.getState().users.userSession.id){
			return store.dispatch(actions.removeMember(data.member, data.id));
		}

		monkeyChatInstance.handleConversationRemove(data.id);
	}
});

// -------------- ON GROUP ADD -------------- //
monkey.on('GroupAdd', function(data){
	if(!store.getState().conversations[data.id]){
		return;
	}

	if(store.getState().users[data.member]){
		return store.dispatch(actions.addMember(data.member, data.id));
	}

	monkey.getInfoById(data.member, function(err, userInfo){
		if(err){
            return console.log(err);
        }

        let users = {};
        let userTmp = {
	    	id: data.member,
	    	name: userInfo.name == undefined ? 'Unknown' : user.name,
	    	avatar: userInfo.avatar ? userInfo.avatar : 'https://cdn.criptext.com/MonkeyUI/images/userdefault.png'
	    }
	    users[userTmp.id] = userTmp;
		store.dispatch(actions.addUsersContact(users));
		store.dispatch(actions.addMember(data.member, data.id));
	});
});

// MonkeyChat

// MonkeyChat: Conversation

function loadConversations(timestamp,firstTime) {
	if(!monkeyChatInstance.state.conversationsLoading){
		monkeyChatInstance.setState({ isLoadingConversations: true });
	}

	monkey.getConversations(timestamp, CONVERSATIONS_LOAD, function(err, resConversations){
      if(err){
            console.log("Error getting conversations "+err);

						monkeyChatInstance.setState({ isLoadingConversations: false });
						monkeyChatInstance.handleShowConversationsLoading(false);
        }else if(resConversations && resConversations.length > 0){
	        let conversations = {};
	        let users = {};
	        let usersToGetInfo = {};
	        resConversations.map (conversation => {

						if(!conversation.info || !Object.keys(conversation.info).length){
		        	conversation.info = {};
		        }

		        // define message
		        let messages = {};
		        let messageId = null;
		        if (conversation.last_message.protocolType != 207){
		        	let message = defineBubbleMessage(conversation.last_message);
		        	if(message){
		        		message.status = conversation.last_message.status == 'read' ? 52 : 51;
			        	messages[message.id] = message;
			        	messageId = message.id;
		        	}
		        }


		      	// define conversation
		        let conversationTmp = {
				    	id: conversation.id,
				    	name: conversation.info.name == undefined ? 'Unknown' : conversation.info.name,
				    	urlAvatar: conversation.info.avatar,
				    	messages: messages,
				    	lastMessage: messageId,
				    	lastModified : conversation.last_modified*1000,
				    	unreadMessageCounter: conversation.unread,
				    	description: null,
				    	loading: false,
							admin: conversation.info.admin || "",
			    	}

		    	count = count + conversation.unread;

		    	// define group conversation
		      if(isConversationGroup(conversation.id)){
			        conversationTmp.members = conversation.members;
			        conversationTmp.description = '';
			        conversationTmp.online = false;
			        // add users into usersToGetInfo
			        conversation.members.map( id => {
				        if(!users[id]){
					        usersToGetInfo[id] = id;
				        }
			        });
		        }else{ // define personal conversation
			        conversationTmp.lastOpenMe = undefined,
				    	conversationTmp.lastSeen = undefined,
				    	conversationTmp.online = undefined
				    	// add user into users
				    	let userTmp = {
					    	id: conversation.id,
					    	name: conversation.info.name == undefined ? 'Unknown' : conversation.info.name,
				    	}
				    	users[userTmp.id] = userTmp;
				    	// delete user from usersToGetInfo
				    	delete usersToGetInfo[userTmp.id];
		        }
		        conversations[conversationTmp.id] = conversationTmp;
	        })

	        if(Object.keys(usersToGetInfo).length){
		        // define usersToGetInfo to array
		        let ids = [];
		        Object.keys(usersToGetInfo).map(id => {
			        if (id !== '' && id !== 'null'){
						ids.push(id);
			        }
		        })

		        // get user info
		        monkey.getInfoByIds(ids, function(err, res){
			        if(err){
			            console.log(err);
			            monkeyChatInstance.setState({
							isLoadingConversations : false
						})
			        }else if(res){
				        if(res.length){
					        let userTmp;
					        // add user into users
					        res.map(user => {
						    	userTmp = {
							    	id: user.monkey_id,
							    	name: user.name == undefined ? 'Unknown' : user.name,
							    }
							    users[userTmp.id] = userTmp;
					        });
				        }
			        }
			        if(Object.keys(users).length){
				        store.dispatch(actions.addUsersContact(users));
			        }
			        store.dispatch(actions.addConversations(conversations));
			        if(firstTime){
			        	monkey.getPendingMessages();
		        	}

					monkeyChatInstance.setState({ isLoadingConversations: false });
			        monkeyChatInstance.handleShowConversationsLoading(false);
		        });

	        }else{
		        if(Object.keys(users).length){
			        store.dispatch(actions.addUsersContact(users));
		        }
		        store.dispatch(actions.addConversations(conversations));
		        if(firstTime){
		        	monkey.getPendingMessages();
	        	}
		        monkeyChatInstance.setState({ isLoadingConversations: false });
			    	monkeyChatInstance.handleShowConversationsLoading(false);
	        }
        }else{
        	monkeyChatInstance.setState({ isLoadingConversations: false });
					monkeyChatInstance.handleShowConversationsLoading(false);
        }
    });
}

function createConversation(conversationId, mokMessage){
	if(store.getState().users[conversationId] == null){
		monkey.getInfoById(conversationId, function(err, data){
			if(err){
	            console.log(err);
	        }else if(data){
						if(!data.info){
							data.info = {}
						}
				if(isConversationGroup(conversationId)){
					store.dispatch(actions.addConversation(defineConversation(conversationId, mokMessage, data.info.name || 'Unknown', data.info.avatar, data.members_info, data.members, data.info.admin || '')));
				}else{
					store.dispatch(actions.addConversation(defineConversation(conversationId, mokMessage, data.name, data.avatar)));
				}
			}
		});
	}else{
		store.dispatch(actions.addConversation(defineConversation(conversationId, mokMessage, store.getState().users[conversationId].name, store.getState().users[conversationId].urlAvatar)));
	}
}

function defineConversation(conversationId, mokMessage, name, urlAvatar, members_info, members,admin){
	// define message
	let messages = {};
	let messageId = null;
	let message = null;
	let unreadMessageCounter = 0;
	let notification_text = "";

	if(mokMessage){
		message = defineBubbleMessage(mokMessage);
	}
	if(message){
		messages[message.id] = message;
		messageId = message.id;
		if(store.getState().users.userSession.id != mokMessage.senderId){
			unreadMessageCounter++;
		}
	}

	// define conversation
	let conversation = {
		id: conversationId,
    	name: name,
    	urlAvatar: urlAvatar,
    	messages: messages,
    	lastMessage: messageId,
    	lastModified: mokMessage ? mokMessage.datetimeCreation*1000 : new Date().getTime(),
    	unreadMessageCounter: unreadMessageCounter,
    	description: null,
    	loading: false
	}

	// define group conversation
	if(members_info){
		conversation.description = '';
		conversation.members = members;
		conversation.admin = admin;
		conversation.online = false;

		// get user info
		let users = {};
		let userTmp;
		members_info.map(user => {
			userTmp = {
		    	id: user.monkey_id,
		    	name: user.name == undefined ? 'Unknown' : user.name,
		    }
		    users[userTmp.id] = userTmp;
		});
		store.dispatch(actions.addUsersContact(users));
	}else{ // define personal conversation
		conversation.lastOpenMe = undefined;
    	conversation.lastSeen = undefined;
    	conversation.online = undefined;
	}

	if(message){
		if (isConversationGroup(conversation.id)) {
		    notification_text = store.getState().users[message.senderId].name + ' has sent a message to ' + conversation.name + '!';
		}else{
			notification_text = conversation.name + ' has sent You a message!';
		}
		if(mokMessage && store.getState().users.userSession.id != mokMessage.senderId && !mky_focused){

			console.log("===== Creating PUSH DEFINE CONVERSATION ")
			monkey.createPush(notification_text, message.preview, 4000, messageId, conversation.urlAvatar, function(){
				monkey.closePush(messageId);
				window.focus();
				monkeyChatInstance.handleConversationOpened(conversation);
			})
		}
	}

	return conversation;
}

// MonkeyChat: Message

function createMessage(message) {
	switch (message.bubbleType){
		case 'text': { // bubble text
			let push = createPush(message.recipientId, message.bubbleType);
			push.andData['session-id'] = isConversationGroup(message.recipientId) ? message.recipientId : store.getState().users.userSession.id;
			push.iosData['category'] = isConversationGroup(message.recipientId) ? message.recipientId : store.getState().users.userSession.id;

			let mokMessage = monkey.sendMessage(message.text, message.recipientId, null,push);
			message.id = mokMessage.id;
			message.oldId = mokMessage.oldId;
			message.datetimeCreation = Number(mokMessage.datetimeCreation*1000);
			message.datetimeOrder = Number(mokMessage.datetimeOrder*1000);
			store.dispatch(actions.addMessage(message, message.recipientId, false));
			break;
		}
		case 'image': { // bubble image
			let push = createPush(message.recipientId, message.bubbleType);
			push.andData['session-id'] = isConversationGroup(message.recipientId) ? message.recipientId : store.getState().users.userSession.id;
			push.iosData['category'] = isConversationGroup(message.recipientId) ? message.recipientId : store.getState().users.userSession.id;

			let mokMessage = monkey.sendFile(message.data, message.recipientId, message.filename, message.mimetype, 3, true, null, push);
			message.id = mokMessage.id;
			message.oldId = mokMessage.oldId;
			message.datetimeCreation = Number(mokMessage.datetimeCreation*1000);
			message.datetimeOrder = Number(mokMessage.datetimeOrder*1000);
			store.dispatch(actions.addMessage(message, message.recipientId, false));
			break;
		}
		case 'file': { // bubble file
			let push = createPush(message.recipientId, message.bubbleType);
			push.andData['session-id'] = isConversationGroup(message.recipientId) ? message.recipientId : store.getState().users.userSession.id;
			push.iosData['category'] = isConversationGroup(message.recipientId) ? message.recipientId : store.getState().users.userSession.id;

			let mokMessage = monkey.sendFile(message.data, message.recipientId, message.filename, message.mimetype, 4, true, null, push);
			message.id = mokMessage.id;
			message.oldId = mokMessage.oldId;
			message.datetimeCreation = Number(mokMessage.datetimeCreation*1000);
			message.datetimeOrder = Number(mokMessage.datetimeOrder*1000);
			store.dispatch(actions.addMessage(message, message.recipientId, false));
			break;
		}
		case 'audio': { // bubble audio
			let push = createPush(message.recipientId, message.bubbleType);
			push.andData['session-id'] = isConversationGroup(message.recipientId) ? message.recipientId : store.getState().users.userSession.id;
			push.iosData['category'] = isConversationGroup(message.recipientId) ? message.recipientId : store.getState().users.userSession.id;

			let mokMessage = monkey.sendFile(message.data, message.recipientId, 'audioTmp.mp3', message.mimetype, 1, true, {length: Number(message.length) }, push);
			message.id = mokMessage.id;
			message.oldId = mokMessage.oldId;
			message.datetimeCreation = Number(mokMessage.datetimeCreation*1000);
			message.datetimeOrder = Number(mokMessage.datetimeOrder*1000);
			store.dispatch(actions.addMessage(message, message.recipientId, false));
			break;
		}
	}
}

// Calling Balloon to the circle that opens the chat conversation window
function isOpenBalloon(){
	// check if baloon exist and if not chech for a status variable that will tell you
	const baloon = document.getElementsByClassName("mky-wrapper-out mky-partialsize mky-rightside animated pulse")[0];

	if(baloon && baloon.offsetWidth == 0)
	{
		return false
	}

	return true
}

function defineMessage(mokMessage, syncing=false) {
	let conversationId = store.getState().users.userSession.id == mokMessage.recipientId ? mokMessage.senderId : mokMessage.recipientId;
	var conversation = store.getState().conversations[conversationId];
	var notification_text = "";

	if(!conversation) { // handle does not exits conversations
		createConversation(conversationId, mokMessage);
		return;
	}else{
		if(conversation.messages[mokMessage.id] != null){
			return;
		}
	}

	let message = defineBubbleMessage(mokMessage);

	if(message){
		// define status
		if( message.datetimeCreation <= store.getState().conversations[conversationId].lastOpenMe ){
			message.status = 52;
		}

		if(message.senderId != store.getState().users.userSession.id){
			store.dispatch(actions.addMessage(message, conversationId, true));
		}else{
			store.dispatch(actions.addMessage(message, conversationId, false));
			store.dispatch(actions.updateConversationUnreadCounter(store.getState().conversations[conversationId], 0));
		}

		console.log("===== NEW I am syncing  now ",syncing)
		if((!conversation.lastMessage ||
			conversation.messages[conversation.lastMessage].datetimeOrder < message.datetimeOrder)
			&& store.getState().users.userSession.id != mokMessage.senderId
			&& !syncing
			&& (!mky_focused || !isOpenBalloon() ))
			{

					//defineNotification(mokMessage,conversationId);

					monkey.closePush(conversation.lastMessage);
					if (isConversationGroup(conversation.id)) {
					    notification_text = store.getState().users[message.senderId].name + ' has sent a message to ' + conversation.name + '!';
					}else{
							notification_text = store.getState().users[message.senderId].name + ' has sent You a message!';
					}
					console.log("===== Creating PUSH from the defineMessage ")
					monkey.createPush(notification_text, message.preview, 4000, message.id, conversation.urlAvatar, function(){
						monkey.closePush(message.id);
						window.focus();
						monkeyChatInstance.handleConversationOpened(conversation);
					})// end createPush

		}
	}
}

function defineBubbleMessage(mokMessage){
	if (!mokMessage.id)
		return;

	let message = {
    	id: mokMessage.id.toString(),
    	oldId: mokMessage.oldId,
    	datetimeCreation: Number(mokMessage.datetimeCreation*1000),
		datetimeOrder: Number(mokMessage.datetimeOrder*1000),
		recipientId: mokMessage.recipientId,
		senderId: mokMessage.senderId,
		status: 50,
		mokMessage: mokMessage,
		isDownloading: false
    }

    switch (mokMessage.protocolType){
    	case 1:{
			if(mokMessage.params && mokMessage.params.type == 14){
					let card = parseVCard(mokMessage.text);

					message.bubbleType = 'contact';
					message.data = {
						name: card.fn || 'Unknown',
						tel: (card.tel && card.tel[0]) ? card.tel[0].value : null,
						photo: card.photo ? card.photo[0].value : null
					};
					message.preview = 'Contact'

			    }else{
			    	message.bubbleType = 'text';
			    	message.text = mokMessage.text;
				    message.preview = mokMessage.text;
	    		}
	    	}
    		break;
    	case 2:{
	    	message.filename = mokMessage.props.filename;
			message.mimetype = mokMessage.props.mime_type;
			message.data = null;
			message.error = false;

	    	if(mokMessage.props.file_type == 1){
		    	message.bubbleType = 'audio';
		    	message.preview = 'Audio';
		    	message.length = mokMessage.params ? mokMessage.params.length : 1;
	    	}else if(mokMessage.props.file_type == 3){
		    	message.bubbleType = 'image';
		    	message.preview = 'Image';
	    	}else if(mokMessage.props.file_type == 4){
		    	message.bubbleType = 'file';
		    	message.preview = 'File';
		    	message.filesize = mokMessage.props.size;
	    	}else{
		    	return undefined;
	    	}
    	}
    		break;
		case 207:{
			return "";
		}
    	default:
    		break;
    }
    return message;
}

function toDownloadMessageData(mokMessage){
	let conversationId = store.getState().users.userSession.id == mokMessage.recipientId ? mokMessage.senderId : mokMessage.recipientId;
	let message = {
			id: mokMessage.id,
			isDownloading: true
	};
    store.dispatch(actions.updateMessageDataStatus(message, conversationId));

	switch(parseInt(mokMessage.props.file_type)){

	case 1: // audio
		monkey.downloadFile(mokMessage, function(err, data){
			let message = {
				id: mokMessage.id,
				data: null,
				error: true
			};
			if(err){
	            console.log(err);
	        }else{
		        let mime = 'audio/mpeg';
		        if(mokMessage.props.mime_type){
			        mime = mokMessage.props.mime_type;
		        }
				let src = `data:${mime};base64,${data}`;
				message.data = src;
				message.error = false;
	        }
	        store.dispatch(actions.updateMessageData(message, conversationId));
		});
		break;
	case 3: // image
		monkey.downloadFile(mokMessage, function(err, data){
			let message = {
				id: mokMessage.id,
				data: null,
				error: true
			};
			if(err){
	            console.log(err);
	        }else{
				let src = `data:${mokMessage.props.mime_type};base64,${data}`;
				message.data = src;
				message.error = false;
	        }
	        store.dispatch(actions.updateMessageData(message, conversationId));
		});
		break;
	case 4: // file
		monkey.downloadFile(mokMessage, function(err, data){
			let message = {
				id: mokMessage.id,
				data: null,
				error: true
			};

			if(err){
	            return console.log(err);
	        }

	        console.log('App - file downloaded');
			//let src = `data:${mokMessage.props.mime_type};base64,${data}`;
			var blob = base64toBlob(data, mokMessage.props.mime_type);
			var url = URL.createObjectURL(blob);
	        message.data = url;
			message.error = false;
			message.isDownloading = false;
	        store.dispatch(actions.updateMessageData(message, conversationId));
			store.dispatch(actions.updateMessageDataStatus(message, conversationId));
		});
		break;
	}
}

function base64toBlob(base64Data, contentType) {
    contentType = contentType || '';
    var sliceSize = 1024;
    var byteCharacters = atob(base64Data);
    var bytesLength = byteCharacters.length;
    var slicesCount = Math.ceil(bytesLength / sliceSize);
    var byteArrays = new Array(slicesCount);

    for (var sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
        var begin = sliceIndex * sliceSize;
        var end = Math.min(begin + sliceSize, bytesLength);

        var bytes = new Array(end - begin);
        for (var offset = begin, i = 0 ; offset < end; ++i, ++offset) {
            bytes[i] = byteCharacters[offset].charCodeAt(0);
        }
        byteArrays[sliceIndex] = new Uint8Array(bytes);
    }
    return new Blob(byteArrays, { type: contentType });
}

function listMembers(members){
	var list;
	if(typeof members == 'string'){
		list = members.split(',');
	}else{
		list = members;
	}
	var names = [];
	var users = store.getState().users;

	list.map(function(id) {
		if(users[id] && users[id].name){
			names.push(users[id].name);
		}
    })
	return names.join(', ');
}

// MonkeyChat: Push

function createPush(conversationId, bubbleType) {

	//const username = store.getState().users.userSession.name;
	const username = "Shippify"
  let pushLocalization;
  let text;
	let locArgs;

		// CUSTOM SHippify, send as it is one to one conversation
		// remember all this messages are sent directly to shipper

    if (!isConversationGroup(conversationId)) {

			locArgs = [username];
			switch(bubbleType) {
							case 'text': // text message
									pushLocalization = 'pushtextKey';
									text = username+' sent you a message';
									break;
							case 'audio': // audio message
									pushLocalization = 'pushaudioKey';
									text = username+' sent you an audio';
									break;
							case 'image': // image message
									pushLocalization = 'pushimageKey';
									text = username+' sent you an image';
									break;
							case 'file': // file message
									pushLocalization = 'pushfileKey';
									text = username+' sent you a file';
									break;
				}

    }else{ // to group
	    //const groupName = store.getState().conversations[conversationId].name.replace('&','-');
	    const groupName = ' Support ';
	    locArgs = [username, groupName];
        switch(bubbleType){
            case 'text': // text message
                pushLocalization = 'grouppushtextKey';
                text = username+' sent a message to';
                break;
            case 'audio': // audio message
                pushLocalization = 'grouppushaudioKey';
                text = username+' sent an audio to';
                break;
            case 'image': // image message
                pushLocalization = 'grouppushimageKey';
                text = username+' sent an image to';
                break;
            case 'file': // file message
                pushLocalization = 'pushfileKey';
                text = username+' sent you a file to';
                break;
        }
    }

    return monkey.generateLocalizedPush(pushLocalization, locArgs, text);
}



function parseVCard(input) {
    var Re1 = /^(version|fn|title|org):(.+)$/i;
    var Re2 = /^([^:;]+);([^:]+):(.+)$/;
    var Re3 = /X-PRO/;
    var Re4 = /:/;
    var ReKey = /item\d{1,2}\./;
    var fields = {};
    var lastKey = '';

    input.split(/\r\n|\r|\n/).forEach(function (line) {
        var results, key;

        if (Re1.test(line)) {
            results = line.match(Re1);
            key = results[1].toLowerCase();
            fields[key] = results[2];
        } else if (Re2.test(line)) {
            results = line.match(Re2);
            key = results[1].replace(ReKey, '').toLowerCase();

            var meta = {};
            results[2].split(';')
                .map(function (p, i) {
                var match = p.match(/([a-z]+)=(.*)/i);
                if (match) {
                    return [match[1], match[2]];
                } else {
                    return ['TYPE' + (i === 0 ? '' : i), p];
                }
            })
                .forEach(function (p) {
                meta[p[0]] = p[1];
            });

            if (!fields[key]) fields[key] = [];

            lastKey = key;

            fields[key].push({
                meta: meta,
                value: results[3].split(';')
            })
        }else if(!Re3.test(line) && !Re4.test(line)){
        	if(lastKey == 'photo'){
        		line = line.replace(' ', '');
        		fields.photo[0].value += line;
        	}
        }else{
        	lastKey = key;
        }
    });
    return fields;
}
//***** Functions added for Shippify ****//
//

function defineNotification(mokMessage,conversationId){

	let messageType = mokMessage.protocolType;
	let content =mokMessage.text;

	switch (messageType) {
	  case monkey.enums.MessageType.TEXT:
	    content = mokMessage.text;
	    break;
	  case monkey.enums.MessageType.FILE:
	    if(monkey.enums.FileType.AUDIO===mokMessage.props.file_type){
	      content = 'Audio Message';
	    }else{
	      content = 'File Message';
	    }
	    break;
	  default:
	      content = 'Default Message';
	}


	let user = store.getState().users[mokMessage.senderId];
	let time = 60000;

	var conversation = store.getState().conversations[conversationId];
	console.log("===== Creating PUSH DEFINE NOTIFICATION ")
	monkey.createPush(user.name,content,time,mokMessage.args.id,conversation.urlAvatar,() => {
	  monkey.closePush(mokMessage.args.id);
	  window.focus();
	  monkeyChatInstance.handleConversationOpened(conversation);
	});
}

function setUnreadMessagesMainBadge(count_messages){
	//$('#count_badge').html(count_messages);
	if(count_messages<=0){
		count=0;
		$("#count_badge").hide();
	}else{
		$("#count_badge").show();
	}
}

function drawMainBadge(){

	let badge = '<div id="count_badge" class="" style="text-align:center; vertical-align: middle;width:20px; height:20px; font-size:13px; background-color:#FBA920; border-radius:50%; position:absolute; color:black !important; right:-1px; top:-4px; font-size: 25px; line-height: 1.5; display:none;">*</div>';
	if($("#count_badge").length==0){
		 $('.mky-button').prepend(badge);
	}
}
function updateConversationCount(conversationId){

	var count = unreadMessagesByConversation[conversationId].count;
	unreadMessagesByConversation[conversationId]={ count : count+1 };
}

function getLastTimestamp(){
	return monkey.session.lastTimestamp;
}


function createShippifyGroup(shipper,callback){

	const method='POST';
	const url='https://admin.shippify.co/externals/monkey/support/new';

	const data = { shipperId:shipper.id,monkeyId: shipper.monkey_id, name:shipper.firstname+' '+shipper.lastname };

	basicAjaxRequest(method,url,data,callback);

}

function basicAjaxRequest(method,url,data,callback){

	$.ajax({
		url:url,
		method:method,
		data:data,
		success: function(data){
			return callback(null,data);
		},
		error:function(error){
			return callback(error);
		}

	})
}
