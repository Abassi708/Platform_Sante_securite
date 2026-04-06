// src/components/VoiceInput.jsx
import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';

const VoiceInput = ({ onTranscript, disabled, language = 'fr-FR' }) => {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [supported, setSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Vérifier si le navigateur supporte la reconnaissance vocale
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.lang = language;
      recognitionInstance.continuous = false;  // S'arrête après une phrase
      recognitionInstance.interimResults = false; // Ne donne que le résultat final
      recognitionInstance.maxAlternatives = 1;
      
      recognitionInstance.onstart = () => {
        console.log('🎤 Reconnaissance vocale démarrée');
        setIsListening(true);
        setErrorMessage('');
      };
      
      recognitionInstance.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log('📝 Texte reconnu:', transcript);
        onTranscript(transcript);
        setIsListening(false);
      };
      
      recognitionInstance.onerror = (event) => {
        console.error('❌ Erreur reconnaissance:', event.error);
        setErrorMessage(getErrorMessage(event.error));
        setIsListening(false);
        
        // Afficher l'erreur pendant 3 secondes
        setTimeout(() => setErrorMessage(''), 3000);
      };
      
      recognitionInstance.onend = () => {
        console.log('🎤 Reconnaissance vocale terminée');
        setIsListening(false);
      };
      
      setRecognition(recognitionInstance);
    } else {
      console.warn('⚠️ Reconnaissance vocale non supportée par ce navigateur');
      setSupported(false);
      setErrorMessage('Reconnaissance vocale non supportée par votre navigateur');
    }
  }, [language, onTranscript]);

  const toggleListening = () => {
    if (!recognition) return;
    
    if (isListening) {
      recognition.stop();
    } else {
      try {
        recognition.start();
      } catch (error) {
        console.error('Erreur démarrage:', error);
        setErrorMessage('Veuillez autoriser le microphone');
        setTimeout(() => setErrorMessage(''), 3000);
      }
    }
  };

  const getErrorMessage = (error) => {
    switch(error) {
      case 'not-allowed':
        return '❌ Veuillez autoriser le microphone';
      case 'no-speech':
        return '🎤 Aucune parole détectée';
      case 'audio-capture':
        return '🎤 Problème avec le microphone';
      default:
        return `🎤 Erreur: ${error}`;
    }
  };

  if (!supported) {
    return (
      <button className="voice-btn disabled" disabled title="Reconnaissance vocale non supportée">
        <Mic size={18} />
      </button>
    );
  }

  return (
    <div className="voice-wrapper">
      <button
        className={`voice-btn ${isListening ? 'listening' : ''}`}
        onClick={toggleListening}
        disabled={disabled}
        title={isListening ? "Arrêter l'écoute" : "Parler à la place de taper"}
      >
        {isListening ? <MicOff size={18} /> : <Mic size={18} />}
      </button>
      {isListening && (
        <div className="voice-wave">
          <span></span><span></span><span></span><span></span>
        </div>
      )}
      {errorMessage && (
        <div className="voice-error">
          <Volume2 size={12} />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

export default VoiceInput;