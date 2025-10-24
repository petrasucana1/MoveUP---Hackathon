import React from 'react';
import { TouchableOpacity, Text, StyleSheet} from 'react-native';
import {Colors} from '../../constants/Colors';
import { Color } from 'three';

interface PurpleButtonProps{
    onPress: () => void;
    title: string;
    size: number;
}

const PurpleButton: React.FC<PurpleButtonProps> = ({onPress, title,size}) => {
    return(
        <TouchableOpacity onPress={onPress} style={styles.button}>
            <Text style={[styles.text, {  fontSize:size,}]}>{title}</Text>
        </TouchableOpacity>
    )
};

const styles= StyleSheet.create({
    button:{
        backgroundColor: Colors.white,
        paddingVertical: 2,
        paddingHorizontal: 60,
        borderRadius: 35,
      
        alignItems: 'center',
        justifyContent: 'center',
    
    },
    text:{
        color: Colors.dark_blue,
        fontFamily:'Poppins',
        textAlign:'center'
    }


});

export default PurpleButton;