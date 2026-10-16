/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TopBar } from './components/TopBar';
import { AudioSelectorLibrary } from './components/AudioSelectorLibrary';
import { SynchronizedPlayer } from './components/SynchronizedPlayer';
import { AudioTranscriptPairingModal } from './components/AudioTranscriptPairingModal';
import { VocabularyBank } from './components/VocabularyBank';
import { LearningGuide } from './components/LearningGuide';
import { AudioTranscriptItem, SavedWord } from './types';
import { SAMPLE_AUDIO_ITEMS } from './data/sampleAudios';
import { UnifiedAudioPlayer } from './utils/audioEngine';
import { 
  getAllCustomItems, 
  saveItem, 
  deleteItem, 
  saveAudioBlob, 
  getAudioBlob, 
  getAllWords, 
  saveWord, 
  deleteWord 
} from './services/db';

export default function App() {
  const [activeView, setActiveView] = useState<'library' | 'player' | 'pairing' | 'vocabulary' | 'guide'>('library');
  const [customItems, setCustomItems] = useState<AudioTranscriptItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<AudioTranscriptItem | null>(null);
  const [selectedBlobUrl, setSelectedBlobUrl] = useState<string | null>(null);
  const [isPairingModalOpen, setIsPairingModalOpen] = useState<boolean>(false);
  const [itemToPair, setItemToPair] = useState<AudioTranscriptItem | null>(null);
  const [savedWords, setSavedWords] = useState<SavedWord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Persistent audio player engine instance
  const playerEngineRef = useRef<UnifiedAudioPlayer | null>(null);
  if (!playerEngineRef.current) {
    playerEngineRef.current = new UnifiedAudioPlayer();
  }
  const playerEngine = playerEngineRef.current;

  // Load persisted custom items & saved words on start
  useEffect(() => {
    async function loadData() {
      try {
        const [loadedCustom, loadedWords] = await Promise.all([
          getAllCustomItems(),
          getAllWords(),
        ]);
        setCustomItems(loadedCustom);
        setSavedWords(loadedWords);

        // Default to first built-in sample
        if (SAMPLE_AUDIO_ITEMS.length > 0) {
          setSelectedItem(SAMPLE_AUDIO_ITEMS[0]);
        }
      } catch (err) {
        console.warn('Error loading from IndexedDB:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();

    return () => {
      playerEngine.destroy();
    };
  }, []);

  // Combined library items (built-in + user custom items)
  const allItems = useMemo(() => {
    return [...customItems, ...SAMPLE_AUDIO_ITEMS];
  }, [customItems]);

  // Handle selecting an audio item to play
  const handleSelectItem = async (item: AudioTranscriptItem) => {
    // Revoke previous blob url if any
    if (selectedBlobUrl && selectedBlobUrl.startsWith('blob:')) {
      URL.revokeObjectURL(selectedBlobUrl);
      setSelectedBlobUrl(null);
    }

    setSelectedItem(item);

    // If item has an audio blob in IndexedDB, retrieve it
    if (item.audioBlobId) {
      try {
        const blob = await getAudioBlob(item.audioBlobId);
        if (blob) {
          const url = URL.createObjectURL(blob);
          setSelectedBlobUrl(url);
        } else {
          setSelectedBlobUrl(null);
        }
      } catch (err) {
        console.warn('Could not load blob from IndexedDB:', err);
        setSelectedBlobUrl(null);
      }
    } else {
      setSelectedBlobUrl(null);
    }

    setActiveView('player');
  };

  // Handle saving new or updated custom item
  const handleSaveItem = async (newItem: AudioTranscriptItem, audioBlob?: Blob) => {
    try {
      if (audioBlob && newItem.audioBlobId) {
        await saveAudioBlob(newItem.audioBlobId, audioBlob, newItem.audioFileName || 'audio_file');
      }

      await saveItem(newItem);

      setCustomItems(prev => {
        const existingIdx = prev.findIndex(it => it.id === newItem.id);
        if (existingIdx >= 0) {
          const copy = [...prev];
          copy[existingIdx] = newItem;
          return copy;
        }
        return [newItem, ...prev];
      });

      // Immediately select the newly saved item
      await handleSelectItem(newItem);
    } catch (err) {
      console.error('Failed to save audio item:', err);
      alert('Hubo un error al guardar el archivo en la base de datos local.');
    }
  };

  // Handle deleting custom item
  const handleDeleteItem = async (id: string) => {
    try {
      await deleteItem(id);
      setCustomItems(prev => prev.filter(it => it.id !== id));
      if (selectedItem?.id === id) {
        setSelectedItem(SAMPLE_AUDIO_ITEMS[0] || null);
        setSelectedBlobUrl(null);
        setActiveView('library');
      }
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  // Handle saving words
  const handleSaveWord = async (word: SavedWord) => {
    try {
      await saveWord(word);
      setSavedWords(prev => {
        const existingIdx = prev.findIndex(w => w.word.toLowerCase() === word.word.toLowerCase());
        if (existingIdx >= 0) {
          const copy = [...prev];
          copy[existingIdx] = word;
          return copy;
        }
        return [word, ...prev];
      });
    } catch (err) {
      console.error('Failed to save word:', err);
    }
  };

  // Toggle word mastered
  const handleToggleMastered = async (wordId: string) => {
    const word = savedWords.find(w => w.id === wordId);
    if (!word) return;
    const updated = { ...word, mastered: !word.mastered };
    try {
      await saveWord(updated);
      setSavedWords(prev => prev.map(w => w.id === wordId ? updated : w));
    } catch (err) {
      console.error('Failed to update word:', err);
    }
  };

  // Delete word
  const handleDeleteWord = async (wordId: string) => {
    try {
      await deleteWord(wordId);
      setSavedWords(prev => prev.filter(w => w.id !== wordId));
    } catch (err) {
      console.error('Failed to delete word:', err);
    }
  };

  const handleOpenPairing = (targetItem?: AudioTranscriptItem) => {
    setItemToPair(targetItem || null);
    setIsPairingModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* 3-Zone Top Navigation Bar */}
      <TopBar
        activeView={activeView}
        onNavigate={(view) => {
          if (view === 'pairing') {
            handleOpenPairing();
          } else {
            setActiveView(view);
          }
        }}
        onOpenUpload={() => handleOpenPairing()}
        hasActiveTrack={Boolean(selectedItem)}
        activeTrackTitle={selectedItem?.title}
        savedWordsCount={savedWords.length}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {isLoading ? (
          <div className="py-24 text-center text-sm text-slate-500">
            Cargando biblioteca de audios y transcripciones...
          </div>
        ) : (
          <>
            {activeView === 'library' && (
              <AudioSelectorLibrary
                items={allItems}
                selectedItem={selectedItem}
                onSelectItem={handleSelectItem}
                onOpenUpload={() => handleOpenPairing()}
                onOpenPairing={handleOpenPairing}
                onDeleteItem={handleDeleteItem}
              />
            )}

            {activeView === 'player' && selectedItem && (
              <SynchronizedPlayer
                item={selectedItem}
                audioBlobUrl={selectedBlobUrl}
                playerEngine={playerEngine}
                onBackToLibrary={() => setActiveView('library')}
                onSaveWord={handleSaveWord}
                savedWords={savedWords}
              />
            )}

            {activeView === 'vocabulary' && (
              <VocabularyBank
                words={savedWords}
                onToggleMastered={handleToggleMastered}
                onDeleteWord={handleDeleteWord}
                onOpenLibrary={() => setActiveView('library')}
              />
            )}

            {activeView === 'guide' && (
              <LearningGuide
                onStartListening={() => setActiveView('library')}
                onOpenPairing={() => handleOpenPairing()}
              />
            )}
          </>
        )}
      </main>

      {/* Dedicated Audio-Transcript Pairing & Synchronization Modal */}
      {isPairingModalOpen && (
        <AudioTranscriptPairingModal
          initialItem={itemToPair}
          onSave={handleSaveItem}
          onClose={() => {
            setIsPairingModalOpen(false);
            setItemToPair(null);
          }}
          existingItems={allItems}
        />
      )}

      {/* Quiet Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">LingoSync</span>
            <span aria-hidden="true">·</span>
            <span>Selector & Reproductor de Audios y Transcripciones de Inglés</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span>Almacenamiento Local Seguro en Navegador</span>
            <span aria-hidden="true">·</span>
            <span>Compatible con SRT, VTT, MP3 y WAV</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
