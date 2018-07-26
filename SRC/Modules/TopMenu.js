
import React, {Component} from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  ActivityIndicator,
  Image,
  AsyncStorage,
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
import Button        from '../Helper/GetButton';
import API           from '../Helper/API';

/* promotion fen - "8/2P5/8/8/3r4/8/2K5/k7 w - - 0 1" */

const {height, width} = Dimensions.get('window');

class TopMenu extends Component { 
  
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
      chess: new Chess(),
      turn: 'w',
      whiteSide: true, //board orientation
      iAm:'w', //or 'b',
      selectedPiece:-1,
      possMoves:[],
      lastMove:{},
      gameStatus:'',
    } 
  }

  componentDidUpdate = () => {
    let chessInstance = {...this.state.chess};

    if(chessInstance.game_over() === true || chessInstance.in_threefold_repetition() === true){
          console.log('Game over');
          //avoid forever state updation
          if(this.state.gameStatus === 'Checkmate' || this.state.gameStatus === 'Draw' || this.state.gameStatus === 'Stalemate' || this.state.gameStatus === 'Threefold repetition'){
            return;
          }
          else{
            var gameStatus = '';
        
            if(chessInstance.in_checkmate() === true){
              gameStatus = 'Checkmate';
            }
            if(chessInstance.in_draw() === true){
              gameStatus = 'Draw';
            }
            if(chessInstance.in_stalemate() === true){
              gameStatus = 'Stalemate';
            }
            if(chessInstance.in_threefold_repetition() === true){
              gameStatus = 'Threefold repetition';
            }
        
            if(chessInstance.in_checkmate() === true || chessInstance.in_stalemate() === true){
              if(chessInstance.turn() === this.state.turn){
                    console.log('you win');
              }
            }  

            this.gameOver();
            this.setState({
                gameStatus: gameStatus
            })
          }  
    }
    else{
      if(chessInstance.turn() !== this.state.turn){
          if(this.state.iAm != chessInstance.turn()){
            
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
                    selectedPiece: -1,
                    possMoves: [],
                    lastMove:{from: resFrom, to: resTo,},
                    chess:chessInstance
                  });
              })
              .catch((error) => {
                  console.warn(error);
              });
          }

          return this.setState({turn:chessInstance.turn()});
      }      
    }
  }
  
  render() {
    let chessInstance = {...this.state.chess};
    return (
        <View style={[styles.maincontainer,{backgroundColor: GLOBAL_VAR.COLOR.THEME['swan'].defaultPrimary}]}>
          
          <StatusBar
            backgroundColor="transparent"
            barStyle="dark-content" 
       />

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
              this.onBackPress,
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
            
            {(this.state.turn != this.state.iAm && chessInstance.game_over()===false)?<View 
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
                  animating={this.state.turn != this.state.iAm}
                  size="small"
                  color={'white'}  
                />
              
                <Text style={{marginLeft:5,color:'white'}} >
                  Computer is thinking{chessInstance.in_check() === true?' - Check':''}
                </Text>

            </View>:<View/>}
          </View> 

          <View style={styles.gameBoard}>
            {this.getChessBoard(this.state.whiteSide)}
          </View>
          
          <View style={styles.footer}>
            
            {(this.state.turn === this.state.iAm && chessInstance.game_over()===false)?<View 
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
                  Your turn{chessInstance.in_check() === true?' - Check':''}
                </Text>

            </View>:<View/>}
          </View>

        </View>  
    );
  }

  gameOver = () => Alert.alert(
    this.state.gameStatus,
    'Play Again?',
    [
      {text: 'No', onPress: () => {}, style: 'cancel'},
      {text: 'Yes', onPress: this.reset },
    ],
    { cancelable: false }
  );

  hint = async () => {
    const urlLink = `?d=${this.props.settings.difficulty}&fen=${encodeURIComponent(this.state.chess.fen())}`
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
    let chess = {...this.state.chess};
    chess.move({ from, to, promotion });
    this.notify();
    return this.setState({
      selectedPiece: -1,
      possMoves: [],
      chess:chess
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
    let chessInstance = {...this.state.chess};
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
      chess:chessInstance
    });
  }

  notify = () => {
    if(this.props.settings.vibration === true) 
      Vibration.vibrate();
    if(this.props.settings.sound === true)
      this.FX.play(); 
  }

  navigate = (route)=>this.props.navigation.navigate(route)

  onBackPress = ()=>{
    let chessInstance = {...this.state.chess};
    if(chessInstance.turn() === this.state.iAm){
      chessInstance.undo();
      chessInstance.undo();
      return this.setState({
        turn:chessInstance.turn(),
        selectedPiece: -1,//deselect if any
        possMoves: [],
        chess:chessInstance
      });
    }
  }

  getChessBoard = (whiteSide) => {
    var foo = [];

    if(whiteSide === false){
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
    let chessInstance = {...this.state.chess};
    const ii = _i;
    const jj = _j;
    const tempCell = this.getCell(ii,jj);
    const PIECE = this.getPiece(tempCell);

    return (
      <View key={(ii*8) + (jj)} style={styles.btn}>
        {Button(
          <View style={[styles.btnView,{backgroundColor:this.getCellColor(ii,jj,tempCell)}]}>
            {PIECE}
            
          </View>,
          ()=>{
                  console.log("this.state.selectedPiece",this.state.selectedPiece);
                  if(this.state.selectedPiece === -1){
                    
                    if(chessInstance.get(tempCell) === null){
                      return;
                    }

                    if(chessInstance.get(tempCell).color != this.state.iAm){
                      return;
                    }

                    //select new
                    
                    //console.log("poss moves",chessInstance.moves({square: tempCell}));
                    //console.log(this._cleanCellName(chessInstance.moves({square: tempCell})));

                    return this.setState({
                      selectedPiece: tempCell,
                      possMoves: this._cleanCellName(chessInstance.moves({square: tempCell}))
                    });
                  }
                  else{//something already selected
                    //deselect it
                    if(this.state.selectedPiece === tempCell){
                      return this.setState({
                        selectedPiece: -1,
                        possMoves: []
                      });
                    }
                    //or deselect and select new
                    if(chessInstance.get(tempCell) != null){
                      if(chessInstance.get(tempCell).color === this.state.iAm){
                        
                        console.log(chessInstance.moves({square: tempCell}));
                        console.log(this._cleanCellName(chessInstance.moves({square: tempCell})));
                        
                        return this.setState({
                          selectedPiece: tempCell,
                          possMoves: this._cleanCellName(chessInstance.moves({square: tempCell}))
                        });
                      }
                    }  
                    //move and deselect
                    if(this.state.possMoves.indexOf(tempCell) != -1){
                      console.log("Moving");

                      console.log("tempCell",tempCell);
                      console.log("row",ii);
                      console.log("col",jj);
                      var tSelectedPiece = chessInstance.get(this.state.selectedPiece);
                      console.log("selectedPiece",tSelectedPiece);
                      console.log("iAM",this.state.iAm);

                      var promotion = undefined;
                      if(tSelectedPiece.type === 'p'){
                          if(tSelectedPiece.color === 'w' && ii===8){
                            promotion = 'q';
                          }
                          else if(tSelectedPiece.color === 'b' && ii===1){
                            promotion = 'q';
                          }
                      }
                      
                      if(promotion === undefined){
                          chessInstance.move({ 
                            from: this.state.selectedPiece, 
                            to: tempCell
                          });
                      }
                      else{
                          console.log('promoting');
                          chessInstance.move({ 
                            from: this.state.selectedPiece, 
                            to: tempCell,
                            promotion:promotion
                          });
                      }
                      

                      this.notify();
                      
                      return this.setState({
                        selectedPiece: -1,
                        possMoves: [],
                        chess:chessInstance
                      });
                    }
                    else{
                      //illeagal move
                      return this.setState({
                        selectedPiece: -1,
                        possMoves: []
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
    return {
      1:'a', 2:'b', 3:'c', 4:'d', 5:'e', 6:'f', 7:'g', 8:'h'
    }[_j]+_i.toString();
  }

  getCellColor = (_i,_j,_cell) => {    
    let pColor;

    if((_i%2===0 && _j%2===0) || (_i%2!==0 && _j%2!==0)){
      pColor = GLOBAL_VAR.COLOR.CELL_DARK;
    }
    else if((_i%2===0 && _j%2!==0) || (_i%2!==0 && _j%2===0)){
      pColor = GLOBAL_VAR.COLOR.CELL_LIGHT;
    }

    if(this.props.settings.showLastMove === true){
      if(this.state.lastMove){
        if(this.state.lastMove !== {}){
          if(this.state.lastMove.from && this.state.lastMove.to){
              console.log("lastMove",this.state.lastMove);
              if(this.state.possMoves.indexOf(_cell) !== -1){
                pColor = '#FF9419';
              }
          }
        }
      }
    }

    //if(GLOBAL_VAR.APP_SETTING.SHOW_POSS_MOVE === true){
    if(this.props.settings.showPossMove === true){
      if(this.state.selectedPiece !== -1){
        if(this.state.possMoves.indexOf(_cell) !== -1){
          pColor = '#FF9419';
        }
      }
    }  

    return pColor;
  }
  
  getPiece = (_cell) => {
    let chessInstance = {...this.state.chess};
    let piece = chessInstance.get(_cell);
    if(piece===null || piece===undefined){
      return null;
    }

    const _pieceName  = piece.type;
    const _pieceColor = piece.color;

    if(_pieceName==='k' && _pieceColor==='w'){
      return <Image
          style={styles.piece}
          source={require('../Resources/Themes/Classic/kW.png')}
      />;
    }
    else if(_pieceName==='q' && _pieceColor==='w'){
      return <Image
          style={styles.piece}
          source={require('../Resources/Themes/Classic/qW.png')}
      />;
    }
    else if(_pieceName==='r' && _pieceColor==='w'){
      return <Image
          style={styles.piece}
          source={require('../Resources/Themes/Classic/rW.png')}
      />;
    }
    else if(_pieceName==='b' && _pieceColor==='w'){
      return <Image
          style={styles.piece}
          source={require('../Resources/Themes/Classic/bW.png')}
      />;
    }
    else if(_pieceName==='n' && _pieceColor==='w'){
      return <Image
          style={styles.piece}
          source={require('../Resources/Themes/Classic/nW.png')}
      />;
    }
    else if(_pieceName==='p' && _pieceColor==='w'){
      return <Image
          style={styles.piece}
          source={require('../Resources/Themes/Classic/pW.png')}
      />;
    }

    if(_pieceName==='k' && _pieceColor==='b'){
      return <Image
          style={styles.piece}
          source={require('../Resources/Themes/Classic/kB.png')}
      />;
    }
    else if(_pieceName==='q' && _pieceColor==='b'){
      return <Image
          style={styles.piece}
          source={require('../Resources/Themes/Classic/qB.png')}
      />;
    }
    else if(_pieceName==='r' && _pieceColor==='b'){
      return <Image
          style={styles.piece}
          source={require('../Resources/Themes/Classic/rB.png')}
      />;
    }
    else if(_pieceName==='b' && _pieceColor==='b'){
      return <Image
          style={styles.piece}
          source={require('../Resources/Themes/Classic/bB.png')}
      />;
    }
    else if(_pieceName==='n' && _pieceColor==='b'){
      return <Image
          style={styles.piece}
          source={require('../Resources/Themes/Classic/nB.png')}
      />;
    }
    else if(_pieceName==='p' && _pieceColor==='b'){
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
      if(moves[i] === 'O-O'){
        if(this.state.iAm==='w'){
          moves[i] = 'g1'; //e1 -> g1 
        }
      }
      else if(moves[i] === 'O-O-O'){
        if(this.state.iAm==='w'){
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
        if(moves[i].indexOf('=') === 2){
          moves[i] = moves[i].substr(0,2);
        }

        if(moves[i] !== null || moves[i] !== undefined){
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

  getPieceIcon = (_pieceName,_pieceColor) => {
      if(_pieceName==='k' && _pieceColor==='w'){
        return <Image
            style={styles.piece}
            source={require('../Resources/Themes/Classic/kW.png')}
        />;
      }
      else if(_pieceName==='q' && _pieceColor==='w'){
        return <Image
            style={styles.piece}
            source={require('../Resources/Themes/Classic/qW.png')}
        />;
      }
      else if(_pieceName==='r' && _pieceColor==='w'){
        return <Image
            style={styles.piece}
            source={require('../Resources/Themes/Classic/rW.png')}
        />;
      }
      else if(_pieceName==='b' && _pieceColor==='w'){
        return <Image
            style={styles.piece}
            source={require('../Resources/Themes/Classic/bW.png')}
        />;
      }
      else if(_pieceName==='n' && _pieceColor==='w'){
        return <Image
            style={styles.piece}
            source={require('../Resources/Themes/Classic/nW.png')}
        />;
      }
      else if(_pieceName==='p' && _pieceColor==='w'){
        return <Image
            style={styles.piece}
            source={require('../Resources/Themes/Classic/pW.png')}
        />;
      }

      if(_pieceName==='k' && _pieceColor==='b'){
        return <Image
            style={styles.piece}
            source={require('../Resources/Themes/Classic/kB.png')}
        />;
      }
      else if(_pieceName==='q' && _pieceColor==='b'){
        return <Image
            style={styles.piece}
            source={require('../Resources/Themes/Classic/qB.png')}
        />;
      }
      else if(_pieceName==='r' && _pieceColor==='b'){
        return <Image
            style={styles.piece}
            source={require('../Resources/Themes/Classic/rB.png')}
        />;
      }
      else if(_pieceName==='b' && _pieceColor==='b'){
        return <Image
            style={styles.piece}
            source={require('../Resources/Themes/Classic/bB.png')}
        />;
      }
      else if(_pieceName==='n' && _pieceColor==='b'){
        return <Image
            style={styles.piece}
            source={require('../Resources/Themes/Classic/nB.png')}
        />;
      }
      else if(_pieceName==='p' && _pieceColor==='b'){
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

export default connect(mapStateToProps, mapDispatchToProps)(TopMenu);


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



