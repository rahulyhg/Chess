import React, {Component} from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  Image,
  AsyncStorage,
  Modal,
  StatusBar,
  Vibration,
  Platform,
  Alert
} from 'react-native';


let Chess = require('chess.js/chess').Chess;
var Sound         = require('react-native-sound');
import Icon          from 'react-native-vector-icons/Ionicons';
import { StackActions, NavigationActions } from 'react-navigation';
import { connect } from 'react-redux';

import * as actionTypes from '../store/actions';
import GLOBAL_VAR    from '../Globals';
import Toast         from '../Helper/GetToast';
import Button        from '../Helper/GetButton';
import API           from '../Helper/API';

const {height, width} = Dimensions.get('window');

class GameVsComp extends Component { 
  chess = new Chess();/* promotion fen - "8/2P5/8/8/3r4/8/2K5/k7 w - - 0 1" */
  //stockfish = Stockfish.STOCKFISH();

  FX = new Sound(
    (Platform.OS !== 'ios')?
      'movesound.wav':
      '../Resources/moveSound.wav', 
    Sound.MAIN_BUNDLE, 
    error => error?
              console.log('Sound not loaded'):
              null
  );

  constructor(props) {
    super(props);
    this.state = {
      //_showPossMove: true,
      _chess: new Chess(),
      //game
      _turn: 'w',
      _whiteSide: true, //board orientation
      _iAm:'w', //or 'b',
      _selectedPiece:-1,
      _possMoves:[],
      _lastMove:{},
      //game status
      //_gameOverModal:false,
      _gameStatus:'',
      //_gameLeaveModal:false,
      _gameHistoryModal:false,
      //_gameHintModal: false,


      messages: []
    } 
  }


  handleMessage = message => {
    console.log(`APP: got message ${message}`);

    this.setState(state => {
      return { messages: [...state.messages, message] };
    });
  }

  componentDidUpdate = () => {
    var chessInstance = this.state._chess;

    if(chessInstance.game_over() == true || chessInstance.in_threefold_repetition() == true){
          console.log('Game over');
          //avoid forever state updation
          if(this.state._gameStatus == 'Checkmate' || this.state._gameStatus == 'Draw' || this.state._gameStatus == 'Stalemate' || this.state._gameStatus == 'Threefold repetition'){
            return;
          }
          else{
            var gameStatus = '';
        
            if(chessInstance.in_checkmate() == true){
              gameStatus = 'Checkmate';
            }
            if(chessInstance.in_draw() == true){
              gameStatus = 'Draw';
            }
            if(chessInstance.in_stalemate() == true){
              gameStatus = 'Stalemate';
            }
            if(chessInstance.in_threefold_repetition() == true){
              gameStatus = 'Threefold repetition';
            }
        
            if(chessInstance.in_checkmate() == true || chessInstance.in_stalemate() == true){
              if(chessInstance.turn() == this.state._turn){
                    this.getStorageVar('TOTAL_WON')
                    .then((_TOTAL_WON)=>{
                        
                        if(_TOTAL_WON == undefined || _TOTAL_WON == null){
                              AsyncStorage.setItem('TOTAL_WON','1'); 
                        }
                        else{
                          try{
                              var temp = parseInt(_TOTAL_WON);
                              temp += 1;
                              AsyncStorage.setItem('TOTAL_WON',temp.toString());
                          }
                          catch(e){
                              AsyncStorage.setItem('TOTAL_WON','1'); 
                          }    
                        }

                    })
                    .catch((error)=>console.log(error));
              }
            }  

            return setTimeout(() => {
              this.gameOver();
              this.setState({
                _gameStatus: gameStatus
              })
            }, 800);
          }  
    }
    else{
      if(chessInstance.turn() != this.state._turn){
          if(this.state._iAm != chessInstance.turn()){
            
            const urlLink = '?d='
                    +this.props.settings.difficulty
                    +'&fen='
                    +encodeURIComponent(chessInstance.fen());
            
            API(urlLink)
              .then((response)=>{
            
                  var res = response.split(' ');
                  var resFrom  = res[1].substr(0,2);
                  var resTo    = res[1].substr(2,2);
                  
                  var promotion = '';
                  try{
                    promotion  = res[1].substr(4);
                  }catch(e){}
                  
                  console.log('promotion: '+promotion);

                  if(promotion != ''){
                    chessInstance.move({ 
                      from: resFrom, 
                      to: resTo,
                      promotion: promotion
                    });
                  }
                  else{
                    chessInstance.move({ 
                      from: resFrom, 
                      to: resTo 
                    });
                  }
                
                  this.notify();
                  
                  return this.setState({
                    _selectedPiece: -1,
                    _possMoves: [],
                    _lastMove:{from: resFrom, to: resTo,},
                    _chess:chessInstance
                  });
              })
              .catch((error) => {
                  console.warn(error);
              });
          }

          return this.setState({_turn:chessInstance.turn()});
      }      
    }
  }
  
  render() {
    var chessInstance = this.state._chess;
    return (
        <View style={[styles.maincontainer,{backgroundColor: GLOBAL_VAR.COLOR.THEME['swan'].defaultPrimary}]}>
          
          <StatusBar
            backgroundColor="transparent"
            barStyle="dark-content" 
       />

        
          <Modal 
            animationType='fade' 
            transparent={true} 
            visible={this.state._gameHistoryModal} 
            onRequestClose={()=>this.setState({_gameHistoryModal:false})} 
           >
            <View style={styles.modalContainerStyle} >
              <View style={styles.modalStyle} >
                
                <View>
                  <View style={{flexDirection:'row',width:width-100,borderBottomWidth:0.5,borderBottomColor:'grey',padding:10,justifyContent:'space-between',alignItems:'center'}}>
                    <Text style={{fontWeight:'bold'}}>Move History</Text>
                    {Button(
                      <Icon name='md-close' color='grey' />,
                      ()=>this.setState({_gameHistoryModal:false}),
                      {padding:5}
                    )}
                  </View>
                  <View style={{width:width-100,padding:10}}>
                    

                    <View style={{flex:1}}>
              
                      <ScrollView
                        style={{flex:1,height:300}}
                        renderSeparator={()=>{<View style={{borderBottomWidth:1,borderColor:GLOBAL_VAR.COLOR.THEME['swan'].divider}} />}}
                      >
                        {this.getMovesHistory()}
                      </ScrollView>
                      
                      <View style={{flexDirection:'row',justifyContent:'flex-end',marginTop:20}}>
                        {Button(
                          <Text style={{fontWeight:'bold'}}>Ok</Text>,
                          ()=>this.setState({_gameHistoryModal:false}),
                          {marginRight:20,padding:5}
                        )}                
                      </View>  
                    
                    </View>
                  </View>   
                </View>

                
              </View>
            </View>
          </Modal>

          <View style={{width:width,flexDirection:'row',paddingTop:20,}}>
            
            {Button(
              <Icon 
                name={'md-home'} 
                size={30} 
                color={GLOBAL_VAR.COLOR.THEME['swan'].secondaryText}
              />,
              this.leaveGame,
              {padding:5,backgroundColor:'transparent',alignItems:'center',justifyContent:'center'}
            )}
            
            <View style={{flex:1}} />
            
            {Button(
              <Icon 
                name={'md-help'} 
                size={30} 
                color={GLOBAL_VAR.COLOR.THEME['swan'].secondaryText}
              />,
              this.hint,
              {padding:5,backgroundColor:'transparent',alignItems:'center',justifyContent:'center',paddingRight:20}
            )}
            
            {Button(
              <Icon 
                name={'md-undo'} 
                size={30} 
                color={GLOBAL_VAR.COLOR.THEME['swan'].secondaryText}
              />,
              ()=>this._backBtn(),
              {padding:5,backgroundColor:'transparent',alignItems:'center',justifyContent:'center',paddingRight:20}
            )}
            
            {Button(
              <Icon 
                name={'md-clock'} 
                size={30} 
                color={GLOBAL_VAR.COLOR.THEME['swan'].secondaryText}
              />,
              ()=>{
                if(chessInstance.history().length == 0){
                  return Toast('No moves yet!','short');
                }
                else{
                  return this.setState({_gameHistoryModal:true})
                }
              },
              {padding:5,backgroundColor:'transparent',alignItems:'center',justifyContent:'center',paddingRight:20}
            )}
            
            {Button(
              <Icon 
                name={'md-settings'} 
                size={30}
                color={GLOBAL_VAR.COLOR.THEME['swan'].secondaryText} 
              />,
              ()=>this.navigate('Settings'),
              {padding:5,backgroundColor:'transparent',alignItems:'center',justifyContent:'center'}
            )}
          </View>

          <View style={styles.header} >
            
            {(this.state._turn != this.state._iAm && chessInstance.game_over()==false)?<View 
                  style={{
                    flexDirection:'row',
                    alignItems:'center',
                    justifyContent:'center',
                    backgroundColor:'rgba(255,0,0,0.6)',
                    padding:5,
                    borderRadius:3
                  }}
                >  
                
                <ActivityIndicator
                  animating={this.state._turn != this.state._iAm}
                  size="small"
                  color={'white'}  
                />
              
                <Text style={{marginLeft:5,color:'white'}} >
                  Computer is thinking{chessInstance.in_check() == true?' - Check':''}
                </Text>

            </View>:<View/>}
          </View> 

          <View style={styles.gameBoard}>
            {this.getChessBoard(this.state._whiteSide)}
          </View>
          
          <View style={styles.footer}>
            
            {(this.state._turn == this.state._iAm && chessInstance.game_over()==false)?<View 
                  style={{
                    flexDirection:'row',
                    alignItems:'center',
                    justifyContent:'center',
                    backgroundColor:'rgba(0,255,0,0.6)',
                    padding:5,
                    borderRadius:3
                  }}
                >  
              
                <Text style={{color:'white'}} >
                  Your turn{chessInstance.in_check() == true?' - Check':''}
                </Text>

            </View>:<View/>}
          </View>

        </View>  
    );
  }

  gameOver = () => Alert.alert(
      this.state._gameStatus,
      'Play Again?',
      [
        {text: 'No', onPress: () => {}, style: 'cancel'},
        {text: 'Yes', onPress: this.reset },
      ],
      { cancelable: false }
  );

  hint = async () => {
    const urlLink = `?d=${this.props.settings.difficulty}&fen=${encodeURIComponent(this.state._chess.fen())}`
    let res = await API(urlLink);
    res = res.split(' ');
    let resFrom  = res[1].substr(0,2);
    let resTo    = res[1].substr(2,2);

    let promotion = '';
    try{
      promotion  = res[1].substr(4);
    }catch(e){}
       
    return this.makeMove(resFrom, resTo, promotion);
  }

  makeMove = (from, to, promotion) => {
    let chess = {...this.state._chess};
    chess.move({ from, to, promotion });
    this.notify();
    return this.setState({
      _selectedPiece: -1,
      _possMoves: [],
      _chess:chess
    });
  };     

  leaveGame = () => Alert.alert(
      'Leave Game',
      'Are you sure about leaving the game?',
      [
        {text: 'No', onPress: () => {}, style: 'cancel'},
        {text: 'Yes', onPress: this.reset },
      ],
      { cancelable: false }
  );

  reset = () => {
    var chessInstance = this.state._chess;
    chessInstance.reset();
    
    setTimeout(()=>{
      const resetAction = StackActions.reset({
        index: 0,
        actions: [NavigationActions.navigate({ routeName: 'Welcome' })],
      });
      this.props.navigation.dispatch(resetAction);      
    },50);

    return this.setState({
      //_gameOverModal:false,
      //_gameLeaveModal:false,
      _chess:chessInstance
    });
  }

  notify = () => {
    if(this.props.settings.vibration === true) 
      Vibration.vibrate();
    if(this.props.settings.sound === true)
      this.FX.play(()=>this.FX.stop); 
  }

  navigate = (route)=>{
    this.props.navigation.navigate(route);
  }

  _backBtn = ()=>{
    try{
        var chessInstance = this.state._chess;
        if(chessInstance.turn() == this.state._iAm){
          console.log('undo');
          //return ,'short');
          chessInstance.undo();
          chessInstance.undo();
          //console.log(chessInstance.ascii());
          return this.setState({
            _turn:chessInstance.turn(),
            _selectedPiece: -1,//deselect if any
            _possMoves: [],
            _chess:chessInstance
          });
        }
    }
    catch(e){}
  }

  getChessBoard = (_whiteSide) => {
    var foo = [];

    if(_whiteSide == false){
      for(var i=1; i<9; i++){
        for(var j=8; j>0; j--) {
          foo.push(this._renderCell(i,j));
        }
      }
    }
    else{
      for(var i=8; i>0; i--){
        for(var j=1; j<9; j++) {          
          foo.push(this._renderCell(i,j));
        }
      }
    }  

    return foo;
  }
  
  _renderCell = (_i,_j,_cell) => {
    var chessInstance = this.state._chess;
    const ii = _i;
    const jj = _j;
    const tempCell = this.getCell(ii,jj);
    const PIECE = this.getPiece(tempCell);

    return (
      <View key={(ii*8) + (jj)} style={styles.btn}>
        {Button(
          <View style={[styles.btnView,{backgroundColor:this.getCellColor(ii,jj,tempCell)}]}>
            {PIECE}
            {/*(PIECE==null)?PIECE:<Animatable.View duration={850} animation='zoomIn'>{PIECE}</Animatable.View>*/}
          </View>,
          ()=>{
                  console.log("this.state._selectedPiece",this.state._selectedPiece);
                  if(this.state._selectedPiece == -1){
                    
                    if(chessInstance.get(tempCell) == null){
                      return;
                    }

                    if(chessInstance.get(tempCell).color != this.state._iAm){
                      return;
                    }

                    //select new
                    
                    //console.log("poss moves",chessInstance.moves({square: tempCell}));
                    //console.log(this._cleanCellName(chessInstance.moves({square: tempCell})));

                    return this.setState({
                      _selectedPiece: tempCell,
                      _possMoves: this._cleanCellName(chessInstance.moves({square: tempCell}))
                    });
                  }
                  else{//something already selected
                    //deselect it
                    if(this.state._selectedPiece == tempCell){
                      return this.setState({
                        _selectedPiece: -1,
                        _possMoves: []
                      });
                    }
                    //or deselect and select new
                    if(chessInstance.get(tempCell) != null){
                      if(chessInstance.get(tempCell).color == this.state._iAm){
                        
                        console.log(chessInstance.moves({square: tempCell}));
                        console.log(this._cleanCellName(chessInstance.moves({square: tempCell})));
                        
                        return this.setState({
                          _selectedPiece: tempCell,
                          _possMoves: this._cleanCellName(chessInstance.moves({square: tempCell}))
                        });
                      }
                    }  
                    //move and deselect
                    if(this.state._possMoves.indexOf(tempCell) != -1){
                      console.log("Moving");

                      console.log("tempCell",tempCell);
                      console.log("row",ii);
                      console.log("col",jj);
                      var tSelectedPiece = chessInstance.get(this.state._selectedPiece);
                      console.log("_selectedPiece",tSelectedPiece);
                      console.log("iAM",this.state._iAm);

                      var promotion = undefined;
                      if(tSelectedPiece.type == 'p'){
                          if(tSelectedPiece.color == 'w' && ii==8){
                            promotion = 'q';
                          }
                          else if(tSelectedPiece.color == 'b' && ii==1){
                            promotion = 'q';
                          }
                      }
                      
                      if(promotion == undefined){
                          chessInstance.move({ 
                            from: this.state._selectedPiece, 
                            to: tempCell
                          });
                      }
                      else{
                          console.log('promoting');
                          chessInstance.move({ 
                            from: this.state._selectedPiece, 
                            to: tempCell,
                            promotion:promotion
                          });
                      }
                      

                      this.notify();
                      
                      return this.setState({
                        _selectedPiece: -1,
                        _possMoves: [],
                        _chess:chessInstance
                      });
                    }
                    else{
                      //illeagal move
                      return this.setState({
                        _selectedPiece: -1,
                        _possMoves: []
                      });
                    }
                  }
          },
          styles.btn
        )}
      </View>
    );
  }
  
  getCell = (_i,_j) => {
    let foo = GLOBAL_VAR.COLUMN_MAP.NUM2COL[_j].toString();
    let bar = _i.toString();
    return foo+bar;
  }

  getCellColor = (_i,_j,_cell) => {    
    var pColor;

    if((_i%2==0 && _j%2==0) || (_i%2!=0 && _j%2!=0)){
      pColor = GLOBAL_VAR.COLOR.CELL_DARK;
    }
    else if((_i%2==0 && _j%2!=0) || (_i%2!=0 && _j%2==0)){
      pColor = GLOBAL_VAR.COLOR.CELL_LIGHT;
    }

    if(this.props.settings.showLastMove == true){
      if(this.state._lastMove){
        if(this.state._lastMove != {}){
          if(this.state._lastMove.from && this.state._lastMove.to){
              console.log("lastMove",this.state._lastMove);
              if(this.state._possMoves.indexOf(_cell) != -1){
                pColor = '#FF9419';
              }
          }
        }
      }
    }

    //if(GLOBAL_VAR.APP_SETTING.SHOW_POSS_MOVE == true){
    if(this.props.settings.showPossMove == true){
      if(this.state._selectedPiece != -1){
        if(this.state._possMoves.indexOf(_cell) != -1){
          pColor = '#FF9419';
        }
      }
    }  

    return pColor;
  }
  
  getPiece = (_cell) => {
    var chessInstance = this.state._chess;
    let piece = chessInstance.get(_cell);
    if(piece==null || piece==undefined){
      return null;
    }

    const _pieceName  = piece.type;
    const _pieceColor = piece.color;

    if(_pieceName=='k' && _pieceColor=='w'){
      return <Image
          style={styles.piece}
          source={require('../Resources/Themes/Classic/kW.png')}
      />;
    }
    else if(_pieceName=='q' && _pieceColor=='w'){
      return <Image
          style={styles.piece}
          source={require('../Resources/Themes/Classic/qW.png')}
      />;
    }
    else if(_pieceName=='r' && _pieceColor=='w'){
      return <Image
          style={styles.piece}
          source={require('../Resources/Themes/Classic/rW.png')}
      />;
    }
    else if(_pieceName=='b' && _pieceColor=='w'){
      return <Image
          style={styles.piece}
          source={require('../Resources/Themes/Classic/bW.png')}
      />;
    }
    else if(_pieceName=='n' && _pieceColor=='w'){
      return <Image
          style={styles.piece}
          source={require('../Resources/Themes/Classic/nW.png')}
      />;
    }
    else if(_pieceName=='p' && _pieceColor=='w'){
      return <Image
          style={styles.piece}
          source={require('../Resources/Themes/Classic/pW.png')}
      />;
    }

    if(_pieceName=='k' && _pieceColor=='b'){
      return <Image
          style={styles.piece}
          source={require('../Resources/Themes/Classic/kB.png')}
      />;
    }
    else if(_pieceName=='q' && _pieceColor=='b'){
      return <Image
          style={styles.piece}
          source={require('../Resources/Themes/Classic/qB.png')}
      />;
    }
    else if(_pieceName=='r' && _pieceColor=='b'){
      return <Image
          style={styles.piece}
          source={require('../Resources/Themes/Classic/rB.png')}
      />;
    }
    else if(_pieceName=='b' && _pieceColor=='b'){
      return <Image
          style={styles.piece}
          source={require('../Resources/Themes/Classic/bB.png')}
      />;
    }
    else if(_pieceName=='n' && _pieceColor=='b'){
      return <Image
          style={styles.piece}
          source={require('../Resources/Themes/Classic/nB.png')}
      />;
    }
    else if(_pieceName=='p' && _pieceColor=='b'){
      return <Image
          style={styles.piece}
          source={require('../Resources/Themes/Classic/pB.png')}
      />;
    }

    return null;
  }

  _cleanCellName = (_moves) => {
    var moves = _moves;
    //console.log(moves);
    for (var i=0; i<moves.length; i++){
      if(moves[i] == 'O-O'){
        if(this.state._iAm=='w'){
          moves[i] = 'g1'; //e1 -> g1 
        }
      }
      else if(moves[i] == 'O-O-O'){
        if(this.state._iAm=='w'){
          moves[i] = 'c1'; //e1 -> c1
        }
      }
      else{
        //console.log(moves[i].substr(-2));
        moves[i] = moves[i].replace("+", "");
        moves[i] = moves[i].replace("x", "");
        moves[i] = moves[i].replace("Q", "");
        moves[i] = moves[i].replace("N", "");

        //promotion
        if(moves[i].indexOf('=') == 2){
          moves[i] = moves[i].substr(0,2);
        }

        if(moves[i] != null || moves[i] != undefined){
          // "dxe6"] "Qd7+", "Qxd8+"]
          moves[i] = moves[i].substr(-2);
        }
      }  
    }

    return moves;
  }
  
  getStorageVar = async (_str) => {
      try {
        return await AsyncStorage.getItem(_str); 
      } 
      catch (error) {
        console.log('AsyncStorage error: ' + error.message);
      }
  }

  getMovesHistory = () => {
    try{
      var chessInstance = this.state._chess;
      var list = [];
      var history = chessInstance.history({ verbose: true });
      history.reverse();
      //console.log(history);

      for(var i in history){

        list.push(
          <View 
            key={i}
            style={{ 
              flexDirection:'row',
              alignItems:'center',
              padding:10,
              justifyContent:'space-between'
            }} 
          >
            <Text style={{fontWeight:'bold',width:50}} >
              {(history.length-i).toString()}
            </Text>
            
            <View style={{width:50}}>
              {this.getPieceIcon(history[i].piece,history[i].color)}
            </View>

            <Text style={{flex:1,fontWeight:'bold'}} >
              {history[i].from} -> {history[i].to}
            </Text>

            
            <View style={{width:50}}>
              {this.getPieceIcon(history[i].captured,(history[i].color=='w')?'b':'w')}
            </View>

          </View>
        );
      }

      return list;
    }
    catch(e){
      console.log('Exc',e);
    }  
  }

  getPieceIcon = (_pieceName,_pieceColor) => {
      if(_pieceName=='k' && _pieceColor=='w'){
        return <Image
            style={styles.piece}
            source={require('../Resources/Themes/Classic/kW.png')}
        />;
      }
      else if(_pieceName=='q' && _pieceColor=='w'){
        return <Image
            style={styles.piece}
            source={require('../Resources/Themes/Classic/qW.png')}
        />;
      }
      else if(_pieceName=='r' && _pieceColor=='w'){
        return <Image
            style={styles.piece}
            source={require('../Resources/Themes/Classic/rW.png')}
        />;
      }
      else if(_pieceName=='b' && _pieceColor=='w'){
        return <Image
            style={styles.piece}
            source={require('../Resources/Themes/Classic/bW.png')}
        />;
      }
      else if(_pieceName=='n' && _pieceColor=='w'){
        return <Image
            style={styles.piece}
            source={require('../Resources/Themes/Classic/nW.png')}
        />;
      }
      else if(_pieceName=='p' && _pieceColor=='w'){
        return <Image
            style={styles.piece}
            source={require('../Resources/Themes/Classic/pW.png')}
        />;
      }

      if(_pieceName=='k' && _pieceColor=='b'){
        return <Image
            style={styles.piece}
            source={require('../Resources/Themes/Classic/kB.png')}
        />;
      }
      else if(_pieceName=='q' && _pieceColor=='b'){
        return <Image
            style={styles.piece}
            source={require('../Resources/Themes/Classic/qB.png')}
        />;
      }
      else if(_pieceName=='r' && _pieceColor=='b'){
        return <Image
            style={styles.piece}
            source={require('../Resources/Themes/Classic/rB.png')}
        />;
      }
      else if(_pieceName=='b' && _pieceColor=='b'){
        return <Image
            style={styles.piece}
            source={require('../Resources/Themes/Classic/bB.png')}
        />;
      }
      else if(_pieceName=='n' && _pieceColor=='b'){
        return <Image
            style={styles.piece}
            source={require('../Resources/Themes/Classic/nB.png')}
        />;
      }
      else if(_pieceName=='p' && _pieceColor=='b'){
        return <Image
            style={styles.piece}
            source={require('../Resources/Themes/Classic/pB.png')}
        />;
      }

      return null;
  


  
  }
}


const mapStateToProps = state => {
  return {
    theme: state.theme,
    settings: state.settings
  };
};

const mapDispatchToProps = dispatch => {
  return {
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(GameVsComp);


const styles = StyleSheet.create({
  maincontainer: {
    flex: 1,
    alignItems:'center',
    justifyContent:'center',
  },
  header:{
    flex:1,
    alignItems:'center',
    justifyContent:'center',
  },
  gameBoard:{
    width:width,
    height:width+2,
    flexDirection:'row',
    flexWrap:'wrap',
    borderTopWidth:1,
    borderBottomWidth:1,
    borderColor:GLOBAL_VAR.COLOR.DEVIDER
  },
  footer:{
    flex:1,
    alignItems:'center',
    justifyContent:'center',
  },
  btn:{
    alignItems:'center',
    justifyContent:'center',
    width:width/8,
    height:width/8,
  },
  btnView:{
    flex:1,
    width:width/8,
    height:width/8,
    alignItems:'center',
    justifyContent:'center',
  },
  btnTxt:{
    color:GLOBAL_VAR.COLOR.TEXT_ICON,
    fontSize:GLOBAL_VAR.FONT.FONT_H1,
    fontWeight:'bold'
  },
  piece:{
    width:width/8-10,
    height:width/8-10,
  },
  modalContainerStyle:{
    height:height,
    width:width,
    justifyContent:'center',
    alignItems:'center',
    backgroundColor:'rgba(0,0,0,0.5)'
  },

  modalStyle:{
    width:width-100,
    borderRadius:2,
    backgroundColor:'rgba(255,255,255,0.95)',
  },
});