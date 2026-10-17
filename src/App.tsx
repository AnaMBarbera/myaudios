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
import { fetchServerLibrary, persistServerLibrary } from './services/apiSync';
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

  // Load persisted custom items, levels, lessons & saved words on start (Always merge IndexedDB and Server)
  useEffect(() => {
    async function loadData() {
      try {
        const [serverData, loadedCustom, loadedLevels, loadedLessons, loadedWords] = await Promise.all([
          fetchServerLibrary(),
          getAllCustomItems().catch(() => []),
          getAllCourseLevels().catch(() => []),
          getAllCourseLessons().catch(() => []),
          getAllWords().catch(() => []),
        ]);

        setSavedWords(loadedWords || []);

        // 1. Merge Deleted IDs from both local and server
        const combinedDeletedItems = Array.from(new Set([
          ...deletedItemIds,
          ...(serverData?.deletedItemIds || []),
        ]));
        const combinedDeletedLessons = Array.from(new Set([
          ...deletedLessonIds,
          ...(serverData?.deletedLessonIds || []),
        ]));

        // 2. Merge Custom Items (Local IndexedDB + Server)
        // This ensures any audio added by the user in this browser is never lost
        const customMap = new Map<string, AudioTranscriptItem>();
        for (const it of (loadedCustom || [])) {
          if (!combinedDeletedItems.includes(it.id)) {
            customMap.set(it.id, it);
          }
        }
        for (const it of (serverData?.items || [])) {
          if (!combinedDeletedItems.includes(it.id)) {
            customMap.set(it.id, it);
          }
        }
        const mergedCustom = Array.from(customMap.values());

        // 3. Merge Levels
        const levelsMap = new Map<string, CourseLevel>();
        for (const l of INITIAL_COURSE_LEVELS) levelsMap.set(l.id, l);
        for (const l of (serverData?.levels || [])) levelsMap.set(l.id, l);
        for (const l of (loadedLevels || [])) levelsMap.set(l.id, l);
        const mergedLevels = Array.from(levelsMap.values());

        // 4. Merge Lessons
        const lessonsMap = new Map<string, CourseLesson>();
        for (const l of INITIAL_COURSE_LESSONS) {
          if (!combinedDeletedLessons.includes(l.id)) lessonsMap.set(l.id, l);
        }
        for (const l of (serverData?.lessons || [])) {
          if (!combinedDeletedLessons.includes(l.id)) lessonsMap.set(l.id, l);
        }
        for (const l of (loadedLessons || [])) {
          if (!combinedDeletedLessons.includes(l.id)) lessonsMap.set(l.id, l);
        }
        const mergedLessons = Array.from(lessonsMap.values());

        setCustomItems(mergedCustom);
        setLevels(mergedLevels);
        setLessons(mergedLessons);
        setDeletedItemIds(combinedDeletedItems);
        setDeletedLessonIds(combinedDeletedLessons);

        // Select initial audio: prefer custom audio or first sample audio
        const initialAudios = [...mergedCustom, ...SAMPLE_AUDIO_ITEMS].filter(it => !combinedDeletedItems.includes(it.id));
        if (initialAudios.length > 0) {
          // If there is an audio in lesson 1, prefer it
          const lesson1Audio = initialAudios.find(a => a.lessonId === 'b1_leccion_1' || a.levelId === 'ingles_b1');
          setSelectedItem(lesson1Audio || initialAudios[0]);
        }

        // Persist merged state to the server so that ANY URL (including myaudios.ai.studio) has the exact same items
        persistServerLibrary({
          items: mergedCustom,
          levels: mergedLevels,
          lessons: mergedLessons,
          deletedItemIds: combinedDeletedItems,
          deletedLessonIds: combinedDeletedLessons,
        }).catch(console.warn);

        // Also ensure any items from server are stored in local IndexedDB for offline resilience
        for (const it of mergedCustom) {
          saveItem(it).catch(console.warn);
        }
      } catch (err) {
        console.warn('Error loading library data:', err);
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

  // Helper to persist library state directly to backend server
  const syncServer = (
    updatedCustomItems: AudioTranscriptItem[] = customItems,
    updatedLevels: CourseLevel[] = levels,
    updatedLessons: CourseLesson[] = lessons,
    updatedDeletedItems: string[] = deletedItemIds,
    updatedDeletedLessons: string[] = deletedLessonIds
  ) => {
    persistServerLibrary({
      items: updatedCustomItems,
      levels: updatedLevels,
      lessons: updatedLessons,
      deletedItemIds: updatedDeletedItems,
      deletedLessonIds: updatedDeletedLessons,
    }).catch(err => console.warn('Could not sync with server:', err));
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
    const nextLevels = [...levels, newLevel];
    setLevels(nextLevels);
    setSelectedLevelId(id);
    syncServer(customItems, nextLevels, lessons, deletedItemIds, deletedLessonIds);
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
    const nextLessons = [...lessons, newLesson];
    setLessons(nextLessons);
    setSelectedLessonId(id);
    syncServer(customItems, levels, nextLessons, deletedItemIds, deletedLessonIds);
    return newLesson;
  };

  // Save / Update an existing lesson
  const handleSaveLesson = async (updatedLesson: CourseLesson) => {
    try {
      await saveCourseLesson(updatedLesson);
      const nextLessons = lessons.map(l => l.id === updatedLesson.id ? updatedLesson : l);
      setLessons(nextLessons);
      syncServer(customItems, levels, nextLessons, deletedItemIds, deletedLessonIds);
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
          const nextDeletedLessons = [...deletedLessonIds, lessonId];
          const nextLessons = lessons.filter(l => l.id !== lessonId);
          setDeletedLessonIds(nextDeletedLessons);
          setLessons(nextLessons);

          // Unassign any audio assigned to this lesson
          const affectedAudios = allItems.filter(it => it.lessonId === lessonId);
          for (const audio of affectedAudios) {
            const updated = { ...audio, lessonId: undefined };
            await saveItem(updated);
          }
          const nextCustomItems = customItems.map(it => it.lessonId === lessonId ? { ...it, lessonId: undefined } : it);
          setCustomItems(nextCustomItems);

          // Adjust selected lesson if current was deleted
          if (selectedLessonId === lessonId) {
            const remaining = lessons.filter(l => l.id !== lessonId && l.levelId === selectedLevelId);
            setSelectedLessonId(remaining[0]?.id || '');
          }

          syncServer(nextCustomItems, levels, nextLessons, deletedItemIds, nextDeletedLessons);
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

      let nextCustomItems: AudioTranscriptItem[] = [];
      setCustomItems(prev => {
        const existingIdx = prev.findIndex(it => it.id === newItem.id);
        if (existingIdx >= 0) {
          const copy = [...prev];
          copy[existingIdx] = newItem;
          nextCustomItems = copy;
          return copy;
        }
        nextCustomItems = [newItem, ...prev];
        return nextCustomItems;
      });

      // Update selectedItem if it's currently selected
      if (selectedItem?.id === newItem.id) {
        setSelectedItem(newItem);
      }

      // Sync with server directly
      const updatedList = customItems.some(it => it.id === newItem.id)
        ? customItems.map(it => it.id === newItem.id ? newItem : it)
        : [newItem, ...customItems];
      syncServer(updatedList, levels, lessons, deletedItemIds, deletedLessonIds);
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
          const nextDeletedItemIds = [...deletedItemIds, itemId];
          const nextCustomItems = customItems.filter(it => it.id !== itemId);
          setDeletedItemIds(nextDeletedItemIds);
          setCustomItems(nextCustomItems);

          if (selectedItem?.id === itemId) {
            const remaining = allItems.filter(it => it.id !== itemId && !it.isHidden);
            setSelectedItem(remaining[0] || null);
            setSelectedBlobUrl(null);
            if (remaining.length === 0) {
              setActiveView('library');
            }
          }

          syncServer(nextCustomItems, levels, lessons, nextDeletedItemIds, deletedLessonIds);
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

      const nextCustom = [...batch.map(b => b.item), ...customItems];
      setCustomItems(nextCustom);
      syncServer(nextCustom, levels, lessons, deletedItemIds, deletedLessonIds);

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
      <div className={activeView === 'player' ? 'hidden md:block' : ''}>
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
      </div>

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
