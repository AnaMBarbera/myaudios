/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TopBar } from './components/TopBar';
import { CourseHierarchyBar } from './components/CourseHierarchyBar';
import { AudioSelectorLibrary } from './components/AudioSelectorLibrary';
import { SynchronizedPlayer } from './components/SynchronizedPlayer';
import { AudioTranscriptPairingModal } from './components/AudioTranscriptPairingModal';
import { DriveFolderImportModal } from './components/DriveFolderImportModal';
import { DriveLinksInputModal } from './components/DriveLinksInputModal';
import { VocabularyBank } from './components/VocabularyBank';
import { LearningGuide } from './components/LearningGuide';
import { EditLessonModal } from './components/EditLessonModal';
import { EditAudioModal } from './components/EditAudioModal';
import { ConfirmActionModal } from './components/ConfirmActionModal';
import { AudioTranscriptItem, SavedWord, CourseLevel, CourseLesson } from './types';
import { SAMPLE_AUDIO_ITEMS, INITIAL_COURSE_LEVELS, INITIAL_COURSE_LESSONS } from './data/sampleAudios';
import { UnifiedAudioPlayer } from './utils/audioEngine';
import { 
  getAllCustomItems, 
  saveItem, 
  deleteItem, 
  saveAudioBlob, 
  getAudioBlob, 
  getAllWords, 
  saveWord, 
  deleteWord,
  getAllCourseLevels,
  saveCourseLevel,
  getAllCourseLessons,
  saveCourseLesson,
  deleteCourseLesson
} from './services/db';

export default function App() {
  const [activeView, setActiveView] = useState<'library' | 'player' | 'pairing' | 'vocabulary' | 'guide'>('library');
  const [customItems, setCustomItems] = useState<AudioTranscriptItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<AudioTranscriptItem | null>(null);
  const [selectedBlobUrl, setSelectedBlobUrl] = useState<string | null>(null);

  // Deleted tracking for persistent deletions across sample & custom items
  const [deletedItemIds, setDeletedItemIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('lingosync_deleted_items');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [deletedLessonIds, setDeletedLessonIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('lingosync_deleted_lessons');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Course Levels & Lessons hierarchy state
  const [levels, setLevels] = useState<CourseLevel[]>(INITIAL_COURSE_LEVELS);
  const [lessons, setLessons] = useState<CourseLesson[]>(INITIAL_COURSE_LESSONS);
  const [selectedLevelId, setSelectedLevelId] = useState<string>('ingles_b1');
  const [selectedLessonId, setSelectedLessonId] = useState<string>('b1_leccion_1');

  // Show hidden items toggle state
  const [showHidden, setShowHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem('lingosync_show_hidden') === 'true';
    } catch {
      return false;
    }
  });

  // Modals state
  const [isPairingModalOpen, setIsPairingModalOpen] = useState<boolean>(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState<boolean>(false);
  const [isDriveLinksModalOpen, setIsDriveLinksModalOpen] = useState<boolean>(false);
  const [itemToPair, setItemToPair] = useState<AudioTranscriptItem | null>(null);
  const [savedWords, setSavedWords] = useState<SavedWord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Edit modals state
  const [lessonToEdit, setLessonToEdit] = useState<CourseLesson | null>(null);
  const [audioToEdit, setAudioToEdit] = useState<AudioTranscriptItem | null>(null);

  // Confirm delete dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Persistent audio player engine instance
  const playerEngineRef = useRef<UnifiedAudioPlayer | null>(null);
  if (!playerEngineRef.current) {
    playerEngineRef.current = new UnifiedAudioPlayer();
  }
  const playerEngine = playerEngineRef.current;

  // Persist deleted lists and showHidden in localStorage
  useEffect(() => {
    try {
      localStorage.setItem('lingosync_deleted_items', JSON.stringify(deletedItemIds));
    } catch (e) {
      console.warn('Could not save deletedItemIds:', e);
    }
  }, [deletedItemIds]);

  useEffect(() => {
    try {
      localStorage.setItem('lingosync_deleted_lessons', JSON.stringify(deletedLessonIds));
    } catch (e) {
      console.warn('Could not save deletedLessonIds:', e);
    }
  }, [deletedLessonIds]);

  useEffect(() => {
    try {
      localStorage.setItem('lingosync_show_hidden', String(showHidden));
    } catch (e) {
      console.warn('Could not save showHidden:', e);
    }
  }, [showHidden]);

  // Load persisted custom items, levels, lessons & saved words on start
  useEffect(() => {
    async function loadData() {
      try {
        const [loadedCustom, loadedWords, loadedLevels, loadedLessons] = await Promise.all([
          getAllCustomItems(),
          getAllWords(),
          getAllCourseLevels(),
          getAllCourseLessons(),
        ]);

        setCustomItems(loadedCustom);
        setSavedWords(loadedWords);

        // Merge initial levels with custom stored levels
        if (loadedLevels && loadedLevels.length > 0) {
          const mergedLevels = [...INITIAL_COURSE_LEVELS];
          for (const l of loadedLevels) {
            if (!mergedLevels.some(m => m.id === l.id)) {
              mergedLevels.push(l);
            }
          }
          setLevels(mergedLevels);
        }

        // Merge initial lessons with custom stored lessons (filtering out deleted ones)
        const activeStoredLessons = (loadedLessons || []).filter(l => !deletedLessonIds.includes(l.id));
        const mergedLessonsMap = new Map<string, CourseLesson>();

        for (const initLes of INITIAL_COURSE_LESSONS) {
          if (!deletedLessonIds.includes(initLes.id)) {
            mergedLessonsMap.set(initLes.id, initLes);
          }
        }
        for (const storedLes of activeStoredLessons) {
          mergedLessonsMap.set(storedLes.id, storedLes);
        }

        setLessons(Array.from(mergedLessonsMap.values()));

        // Default to first non-deleted B1 audio
        const initialAudios = [...loadedCustom, ...SAMPLE_AUDIO_ITEMS].filter(it => !deletedItemIds.includes(it.id));
        if (initialAudios.length > 0) {
          setSelectedItem(initialAudios[0]);
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

  // Combined library items (built-in + user custom items, with custom overriding built-in, filtering deleted)
  const allItems = useMemo(() => {
    const customMap = new Map(customItems.map(it => [it.id, it]));
    const combined: AudioTranscriptItem[] = [];

    for (const sample of SAMPLE_AUDIO_ITEMS) {
      if (deletedItemIds.includes(sample.id)) continue;
      if (customMap.has(sample.id)) {
        combined.push(customMap.get(sample.id)!);
        customMap.delete(sample.id);
      } else {
        combined.push(sample);
      }
    }

    for (const custom of customMap.values()) {
      if (deletedItemIds.includes(custom.id)) continue;
      combined.push(custom);
    }

    return combined;
  }, [customItems, deletedItemIds]);

  // Handle selecting an audio item to play
  const handleSelectItem = async (item: AudioTranscriptItem) => {
    if (selectedBlobUrl && selectedBlobUrl.startsWith('blob:')) {
      URL.revokeObjectURL(selectedBlobUrl);
      setSelectedBlobUrl(null);
    }

    setSelectedItem(item);
    if (item.levelId) setSelectedLevelId(item.levelId);
    if (item.lessonId) setSelectedLessonId(item.lessonId);

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

  // Add new level
  const handleAddLevel = (name: string): CourseLevel => {
    const id = `level_${Date.now()}_${name.toLowerCase().replace(/\s+/g, '_')}`;
    const newLevel: CourseLevel = {
      id,
      name,
      order: levels.length + 1,
    };
    saveCourseLevel(newLevel).catch(console.error);
    setLevels(prev => [...prev, newLevel]);
    setSelectedLevelId(id);
    return newLevel;
  };

  // Add new lesson to a level
  const handleAddLesson = (levelId: string, title: string, subtitle?: string): CourseLesson => {
    const id = `lesson_${Date.now()}_${title.toLowerCase().replace(/\s+/g, '_')}`;
    const newLesson: CourseLesson = {
      id,
      levelId,
      title,
      subtitle,
      order: lessons.filter(l => l.levelId === levelId).length + 1,
      isHidden: false,
    };
    saveCourseLesson(newLesson).catch(console.error);
    setLessons(prev => [...prev, newLesson]);
    setSelectedLessonId(id);
    return newLesson;
  };

  // Save / Update an existing lesson
  const handleSaveLesson = async (updatedLesson: CourseLesson) => {
    try {
      await saveCourseLesson(updatedLesson);
      setLessons(prev => prev.map(l => l.id === updatedLesson.id ? updatedLesson : l));
    } catch (err) {
      console.error('Error saving lesson:', err);
    }
  };

  // Toggle hide / unhide a lesson
  const handleToggleHideLesson = async (lessonId: string) => {
    const lesson = lessons.find(l => l.id === lessonId);
    if (!lesson) return;
    const updated: CourseLesson = { ...lesson, isHidden: !lesson.isHidden };
    await handleSaveLesson(updated);
  };

  // Request delete a lesson (with confirmation modal)
  const handleRequestDeleteLesson = (lessonId: string) => {
    const lesson = lessons.find(l => l.id === lessonId);
    if (!lesson) return;

    setConfirmDialog({
      isOpen: true,
      title: `¿Eliminar "${lesson.title}"?`,
      message: `Esta acción eliminará la lección de tu curso. Los audios asociados no se perderán: permanecerán en este nivel como audios sin lección para que puedas reasignarlos.`,
      onConfirm: async () => {
        try {
          await deleteCourseLesson(lessonId);
          setDeletedLessonIds(prev => [...prev, lessonId]);
          setLessons(prev => prev.filter(l => l.id !== lessonId));

          // Unassign any audio assigned to this lesson
          const affectedAudios = allItems.filter(it => it.lessonId === lessonId);
          for (const audio of affectedAudios) {
            const updated = { ...audio, lessonId: undefined };
            await saveItem(updated);
          }
          setCustomItems(prev => prev.map(it => it.lessonId === lessonId ? { ...it, lessonId: undefined } : it));

          // Adjust selected lesson if current was deleted
          if (selectedLessonId === lessonId) {
            const remaining = lessons.filter(l => l.id !== lessonId && l.levelId === selectedLevelId);
            setSelectedLessonId(remaining[0]?.id || '');
          }
        } catch (err) {
          console.error('Error deleting lesson:', err);
        } finally {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Save or update an audio item
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

      // Update selectedItem if it's currently selected
      if (selectedItem?.id === newItem.id) {
        setSelectedItem(newItem);
      }
    } catch (err) {
      console.error('Failed to save audio item:', err);
      alert('Hubo un error al guardar el archivo en la base de datos local.');
    }
  };

  // Toggle hide / unhide an audio
  const handleToggleHideAudio = async (itemId: string) => {
    const item = allItems.find(it => it.id === itemId);
    if (!item) return;
    const updated: AudioTranscriptItem = { ...item, isHidden: !item.isHidden };
    await handleSaveItem(updated);
  };

  // Request delete an audio (with confirmation modal)
  const handleRequestDeleteAudio = (itemId: string) => {
    const item = allItems.find(it => it.id === itemId);
    if (!item) return;

    setConfirmDialog({
      isOpen: true,
      title: `¿Eliminar "${item.title}"?`,
      message: `Esta acción eliminará el audio y su transcripción asociada de tu biblioteca de aprendizaje.`,
      onConfirm: async () => {
        try {
          await deleteItem(itemId);
          setDeletedItemIds(prev => [...prev, itemId]);
          setCustomItems(prev => prev.filter(it => it.id !== itemId));

          if (selectedItem?.id === itemId) {
            const remaining = allItems.filter(it => it.id !== itemId && !it.isHidden);
            setSelectedItem(remaining[0] || null);
            setSelectedBlobUrl(null);
            if (remaining.length === 0) {
              setActiveView('library');
            }
          }
        } catch (err) {
          console.error('Failed to delete item:', err);
        } finally {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Batch import from Drive modal
  const handleImportFromDrive = async (batch: { item: AudioTranscriptItem; audioBlob?: Blob }[]) => {
    try {
      for (const entry of batch) {
        if (entry.audioBlob && entry.item.audioBlobId) {
          await saveAudioBlob(entry.item.audioBlobId, entry.audioBlob, entry.item.audioFileName || 'audio_file');
        }
        await saveItem(entry.item);
      }

      setCustomItems(prev => [...batch.map(b => b.item), ...prev]);

      if (batch.length > 0) {
        await handleSelectItem(batch[0].item);
      }
    } catch (err) {
      console.error('Error batch importing:', err);
      alert('Error guardando archivos en la biblioteca local.');
    }
  };

  // Words handlers
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
        onOpenUpload={() => setIsDriveLinksModalOpen(true)}
        hasActiveTrack={Boolean(selectedItem)}
        activeTrackTitle={selectedItem?.title}
        savedWordsCount={savedWords.length}
      />

      {/* Hierarchical Breadcrumb Navigation Bar: Ingles B1 > lección 1 > Audio */}
      <CourseHierarchyBar
        levels={levels}
        lessons={lessons}
        allItems={allItems}
        selectedLevelId={selectedLevelId}
        selectedLessonId={selectedLessonId}
        selectedItem={selectedItem}
        showHidden={showHidden}
        onToggleShowHidden={() => setShowHidden(prev => !prev)}
        onSelectLevel={(levelId) => {
          setSelectedLevelId(levelId);
          const firstLesson = lessons.find(l => l.levelId === levelId && (!l.isHidden || showHidden));
          if (firstLesson) {
            setSelectedLessonId(firstLesson.id);
            const firstAudio = allItems.find(a => a.lessonId === firstLesson.id && (!a.isHidden || showHidden));
            if (firstAudio) handleSelectItem(firstAudio);
          }
        }}
        onSelectLesson={(lessonId) => {
          setSelectedLessonId(lessonId);
          const firstAudio = allItems.find(a => a.lessonId === lessonId && (!a.isHidden || showHidden));
          if (firstAudio) handleSelectItem(firstAudio);
        }}
        onSelectAudioItem={handleSelectItem}
        onOpenDriveModal={() => setIsDriveModalOpen(true)}
        onOpenDriveLinksModal={() => setIsDriveLinksModalOpen(true)}
        onAddLevel={handleAddLevel}
        onAddLesson={handleAddLesson}
        onEditLesson={(les) => setLessonToEdit(les)}
        onToggleHideLesson={handleToggleHideLesson}
        onDeleteLesson={handleRequestDeleteLesson}
        onEditAudio={(audio) => setAudioToEdit(audio)}
        onToggleHideAudio={handleToggleHideAudio}
        onDeleteAudio={handleRequestDeleteAudio}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {isLoading ? (
          <div className="py-24 text-center text-sm text-slate-500">
            Cargando niveles, lecciones y audios sincronizados...
          </div>
        ) : (
          <>
            {activeView === 'library' && (
              <AudioSelectorLibrary
                items={allItems}
                levels={levels}
                lessons={lessons}
                selectedLevelId={selectedLevelId}
                selectedLessonId={selectedLessonId}
                selectedItem={selectedItem}
                showHidden={showHidden}
                onToggleShowHidden={() => setShowHidden(prev => !prev)}
                onSelectLevel={setSelectedLevelId}
                onSelectLesson={setSelectedLessonId}
                onSelectItem={handleSelectItem}
                onOpenUpload={() => setIsDriveLinksModalOpen(true)}
                onOpenPairing={handleOpenPairing}
                onOpenDriveModal={() => setIsDriveModalOpen(true)}
                onOpenDriveLinksModal={() => setIsDriveLinksModalOpen(true)}
                onAddLevel={handleAddLevel}
                onAddLesson={handleAddLesson}
                onEditLesson={(les) => setLessonToEdit(les)}
                onToggleHideLesson={handleToggleHideLesson}
                onDeleteLesson={handleRequestDeleteLesson}
                onEditAudio={(audio) => setAudioToEdit(audio)}
                onToggleHideAudio={handleToggleHideAudio}
                onDeleteAudio={handleRequestDeleteAudio}
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
                onUpdateItem={handleSaveItem}
                onEditItem={(item) => setAudioToEdit(item)}
                onToggleHideItem={handleToggleHideAudio}
                onDeleteItem={handleRequestDeleteAudio}
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

      {/* Edit Lesson Modal */}
      {lessonToEdit && (
        <EditLessonModal
          lesson={lessonToEdit}
          levels={levels}
          onClose={() => setLessonToEdit(null)}
          onSave={handleSaveLesson}
          onDelete={handleRequestDeleteLesson}
          onToggleHide={handleToggleHideLesson}
        />
      )}

      {/* Edit Audio Modal */}
      {audioToEdit && (
        <EditAudioModal
          item={audioToEdit}
          levels={levels}
          lessons={lessons}
          onClose={() => setAudioToEdit(null)}
          onSave={handleSaveItem}
          onDelete={handleRequestDeleteAudio}
          onToggleHide={handleToggleHideAudio}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmActionModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Google Drive Link Input Modal (Direct URLs without downloading) */}
      {isDriveLinksModalOpen && (
        <DriveLinksInputModal
          levels={levels}
          lessons={lessons}
          defaultLevelId={selectedLevelId}
          defaultLessonId={selectedLessonId}
          onClose={() => setIsDriveLinksModalOpen(false)}
          onSave={(newItem) => {
            handleSaveItem(newItem);
            handleSelectItem(newItem);
          }}
          onAddLevel={handleAddLevel}
          onAddLesson={handleAddLesson}
        />
      )}

      {/* Google Drive Folder Synchronizer Modal */}
      {isDriveModalOpen && (
        <DriveFolderImportModal
          levels={levels}
          lessons={lessons}
          onClose={() => setIsDriveModalOpen(false)}
          onImportItems={handleImportFromDrive}
          onAddLevel={handleAddLevel}
          onAddLesson={handleAddLesson}
        />
      )}

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
          levels={levels}
          lessons={lessons}
          defaultLevelId={selectedLevelId}
          defaultLessonId={selectedLessonId}
        />
      )}

      {/* Quiet Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">LingoSync</span>
            <span aria-hidden="true">·</span>
            <span>Estructura de Cursos & Reproductor de Audios Sincronizados de Inglés</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span>Gestión de Lecciones y Audios</span>
            <span aria-hidden="true">·</span>
            <span>Edición, Ocultación y Eliminación</span>
            <span aria-hidden="true">·</span>
            <span>Streaming Google Drive & .VTT</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
