import React, { Component } from 'react'
import { defineTime } from '../utils/monkey-utils.js'

const Bubble = Component => class extends Component {
	constructor(props){
		super(props);
		this.styleName;
		this.username;
		this.resendMessage = this.resendMessage.bind(this);
	}

	componentWillMount() {
        this.username = this.props.getUserName(this.props.message.senderId);
	}

	render() {
		let classBubble = this.defineClass();
		let styleBubble = this.defineStyles();
		if(this.props.message.nameColor){
			this.styleName = { color: this.props.message.nameColor };
		}
		
    	return (
			<div className='mky-message-line'>
				<div id={this.props.message.id} className={classBubble} style={styleBubble}>
					<div className="mky-message-detail">
					{ this.props.userSessionId === this.props.message.senderId
						? <Status value={this.props.message.status} classStatus={this.defineStatusClass(this.props.message.status) } resendFunction={this.resendMessage}/>
						: ( this.username
							? <span className="mky-message-user-name">{this.username}</span>
							: null
						)
					}
						<span className="mky-message-hour">{defineTime(this.props.message.datetimeCreation)}</span>
					</div>
					<Component {...this.props}/>
				</div>
			</div>
		)
	}

	defineStatusClass(status) {
		let state;
		switch(status){
            case 0:
                state = 'load';
                break;
            case 50:
                state = 'sent';
                break;
            case 51:
                state = 'sent';
                break;
            case 52:
                state = 'read';
                break;
        }

        return 'mky-status-'+state;
	}

	defineClass() {
		const prefix = 'mky-';
		const baseClass = 'bubble';
		let layerClass = this.props.layerClass;
		let side = '';
		if(this.props.userSessionId === this.props.message.senderId){
			side = 'out';
		}else{
			side = 'in';
		}

		return prefix+baseClass+' '+prefix+baseClass+'-'+side+' '+prefix+baseClass+'-'+layerClass+' '+prefix+baseClass+'-'+layerClass+'-'+side
	}

	defineStyles() {
		if(this.props.layerClass == 'text' && this.props.styles != null){
			if(this.props.userSessionId === this.props.message.senderId && this.props.styles.colorOut != null){
				return {background: this.props.styles.colorOut, borderColor: this.props.styles.colorOut};
			}
			else if(this.props.userSessionId != this.props.message.senderId && this.props.styles.colorIn != null){
				return {background: this.props.styles.colorIn, borderColor: this.props.styles.colorIn};
			}
		}
		else{
			return {};
		}
	}
	resendMessage(){
		console.log('resend function');
	}
}

const Status = ({value, classStatus, resendFunction}) => (
	<div className={"mky-message-status "+classStatus} onClick={resendFunction}>
		{
			value !== 0 ? (
				value == -1 ? <i className="demo-icon mky-check">!</i> : <i className="demo-icon mky-check">&#xe80a;</i>
			)
			: null
		}
	</div>
);

export default Bubble;
