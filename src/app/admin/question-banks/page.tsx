"use client";

import { useState, useEffect } from 'react';
import { useDeveloperStore } from '@/store';
import { useRouter } from 'next/navigation';
import { adminAPI } from '@/api/index.js';
import { PageHeader } from '@/components/layout/index.jsx';
import { Card, ActionMenu } from '@/components/ui/index.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Folder, FolderOpen, FileText, ChevronRight, Upload, Plus, Trash2, ArrowLeft, Edit2, Edit, Eye, EyeOff } from 'lucide-react';
import { DeleteModal, Modal, ModalHeader, ModalBody, ModalFooter, ConfirmModal } from '@/components/modals/index.jsx';
import toast from 'react-hot-toast';
import { AdvancedEditor } from '@/components/ui/AdvancedEditor';

export default function QuestionBanks() {
  const { isDeveloperMode } = useDeveloperStore();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [hierarchy, setHierarchy] = useState([]);
  const [topicQuestions, setTopicQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  
  const [activeTab, setActiveTab] = useState('CLASS_FOLDERS'); // 'CLASS_FOLDERS' | 'FULL_PAPERS' | 'PART_PAPERS'
  const [fullPapers, setFullPapers] = useState([]);
  const [loadingFullPapers, setLoadingFullPapers] = useState(false);
  // fullPaperPath: Level 0: [], Level 1: [class], Level 2: [class, paper], Level 3: [class, paper, subject], Level 4: [class, paper, subject, chapter], Level 5: [class, paper, subject, chapter, topic]
  const [fullPaperPath, setFullPaperPath] = useState([]);
  const [fullPaperData, setFullPaperData] = useState(null);

  const [partPapers, setPartPapers] = useState([]);
  const [loadingPartPapers, setLoadingPartPapers] = useState(false);
  // partPaperPath: Level 0: [], Level 1: [class], Level 2: [class, paper], Level 3: [class, paper, subject], Level 4: [class, paper, subject, chapter], Level 5: [class, paper, subject, chapter, topic]
  const [partPaperPath, setPartPaperPath] = useState([]);
  const [partPaperData, setPartPaperData] = useState(null);
  
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  const [promptModal, setPromptModal] = useState({
    isOpen: false,
    title: '',
    value: '',
    onSubmit: null
  });
  
  // path for CLASS_FOLDERS:
  // Level 0: [] (Root / Class Folders)
  // Level 1: [{ type: 'CLASS', id: 'clsId', name: 'Class 11' }]
  // Level 2: [{ type: 'CLASS', ... }, { type: 'SUBJECT', id: 'sId', name: 'Physics', ref: subjectNode }]
  // Level 3: [{ type: 'CLASS', ... }, { type: 'SUBJECT', ... }, { type: 'CHAPTER', id: 'cId', name: 'Kinematics', ref: chapterNode }]
  // Level 4: [{ type: 'CLASS', ... }, { type: 'SUBJECT', ... }, { type: 'CHAPTER', ... }, { type: 'TOPIC', id: 'tId', name: 'Velocity', ref: topicNode }]
  const [path, setPath] = useState([]);

  useEffect(() => {
    fetchData();
    fetchFullPapers();
    fetchPartPapers();
  }, []);

  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState(false);

  const handleEditClick = (q, bankIdOverride = null) => {
    const qCopy = JSON.parse(JSON.stringify(q));
    if (bankIdOverride) qCopy.bankId = bankIdOverride;
    setEditingQuestion(qCopy);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingQuestion._id || !editingQuestion.bankId) return toast.error("Cannot edit this question.");
    try {
      setSavingQuestion(true);
      await adminAPI.updateSingleQuestion(editingQuestion.bankId, editingQuestion._id, editingQuestion);
      toast.success("Question updated successfully");
      
      if (activeTab === 'FULL_PAPERS' && fullPaperData) {
        const updated = fullPaperData.questions.map(q => q._id === editingQuestion._id ? editingQuestion : q);
        setFullPaperData({ ...fullPaperData, questions: updated });
      } else if (activeTab === 'PART_PAPERS' && partPaperData) {
        const updated = partPaperData.questions.map(q => q._id === editingQuestion._id ? editingQuestion : q);
        setPartPaperData({ ...partPaperData, questions: updated });
      } else {
        const updated = topicQuestions.map(q => q._id === editingQuestion._id ? editingQuestion : q);
        setTopicQuestions(updated);
      }
      
      setIsEditModalOpen(false);
      setEditingQuestion(null);
    } catch (err) {
      toast.error("Failed to update question");
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (qId, bankId) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    try {
      await adminAPI.deleteSingleQuestion(bankId, qId);
      toast.success("Question deleted successfully");
      
      if (activeTab === 'FULL_PAPERS' && fullPaperData) {
        const updated = fullPaperData.questions.filter(q => q._id !== qId);
        setFullPaperData({ ...fullPaperData, questions: updated });
      } else if (activeTab === 'PART_PAPERS' && partPaperData) {
        const updated = partPaperData.questions.filter(q => q._id !== qId);
        setPartPaperData({ ...partPaperData, questions: updated });
      } else {
        const updated = topicQuestions.filter(q => q._id !== qId);
        setTopicQuestions(updated);
      }
    } catch (err) {
      toast.error("Failed to delete question");
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [classesRes, catRes, hierRes] = await Promise.all([
        adminAPI.getQuestionClasses().catch(err => {
          console.warn("Classes endpoint not yet available, will restart server", err);
          return { data: { data: [] } };
        }),
        adminAPI.getQuestionCategories(),
        adminAPI.getQuestionBankHierarchy()
      ]);
      setClasses(classesRes.data?.data || []);
      setSubjects(catRes.data?.data || []);
      setHierarchy(hierRes.data?.data || []);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchFullPapers = async () => {
    try {
      setLoadingFullPapers(true);
      const res = await adminAPI.getQuestionBanks({ type: 'FULL_PAPER' });
      setFullPapers(res.data?.data || []);
    } catch (error) {
      toast.error('Failed to load full papers');
    } finally {
      setLoadingFullPapers(false);
    }
  };

  const fetchPartPapers = async () => {
    try {
      setLoadingPartPapers(true);
      const res = await adminAPI.getQuestionBanks({ type: 'PART_PAPER' });
      setPartPapers(res.data?.data || []);
    } catch (error) {
      toast.error('Failed to load part papers');
    } finally {
      setLoadingPartPapers(false);
    }
  };

  const handleTogglePublish = async (e, type, id, currentlyUnpublished) => {
    e.stopPropagation();
    const targetVal = !currentlyUnpublished;
    try {
      const updateRef = (item) => {
        if (!item) return;
        if (type === 'subject' && item._id === id) item.isUnpublished = targetVal;
        else if (type === 'chapter' && item._id === id) item.isUnpublished = targetVal;
        else if (type === 'topic' && item._id === id) item.isUnpublished = targetVal;
        
        if (item.chapters) item.chapters.forEach(updateRef);
        if (item.topics) item.topics.forEach(updateRef);
      };

      setHierarchy(prev => {
        const newH = [...prev];
        newH.forEach(updateRef);
        return newH;
      });
      
      setPath(prev => {
        const newP = [...prev];
        newP.forEach(p => {
          if (p.ref) updateRef(p.ref);
        });
        return newP;
      });

      await adminAPI.togglePublishCategory(type, id, targetVal);
      toast.success(currentlyUnpublished ? "Published!" : "Unpublished!");
    } catch (err) {
      toast.error("Failed to update status");
      fetchData(); // revert
    }
  };

  const handleDeleteSubFolder = async (e, type, id) => {
    e.stopPropagation();
    setItemToDelete({
      name: `${type}`,
      onConfirm: async () => {
        try {
          if (type === 'chapter') await adminAPI.deleteQuestionChapter(id);
          else if (type === 'topic') await adminAPI.deleteQuestionTopic(id);
          toast.success(`${type} moved to Recycle Bin!`);
          fetchData(); // re-fetch hierarchy
        } catch (err) {
          toast.error("Failed to delete");
        }
      }
    });
  };

  // Class Management Handlers
  const handleCreateClass = async () => {
    setPromptModal({
      isOpen: true,
      title: "Enter new Class folder name (e.g. Class 11, Class 12):",
      value: "",
      onSubmit: async (name) => {
        if (!name || !name.trim()) return;
        try {
          await adminAPI.createQuestionClass({ name: name.trim() });
          toast.success("Class folder created!");
          fetchData();
        } catch (err) {
          toast.error(err.response?.data?.message || "Failed to create class folder. Make sure server is restarted.");
        }
      }
    });
  };

  const handleRenameClass = async (e, id, oldName) => {
    e.stopPropagation();
    setPromptModal({
      isOpen: true,
      title: "Enter new Class name:",
      value: oldName,
      onSubmit: async (newName) => {
        if (!newName || newName.trim() === oldName) return;
        try {
          await adminAPI.renameQuestionClass(id, { name: newName.trim() });
          toast.success("Class renamed!");
          fetchData();
        } catch (err) {
          toast.error(err.response?.data?.message || "Failed to rename class");
        }
      }
    });
  };

  const handleDeleteClass = async (e, id, className) => {
    e.stopPropagation();
    setItemToDelete({
      name: `Class "${className}"`,
      onConfirm: async () => {
        try {
          await adminAPI.deleteQuestionClass(id);
          toast.success("Class deleted!");
          fetchData();
        } catch (err) {
          toast.error(err.response?.data?.message || "Failed to delete class");
        }
      }
    });
  };

  // Subject Management Handlers
  const handleCreateSubject = async (classId, className) => {
    setPromptModal({
      isOpen: true,
      title: "Enter new Subject name (e.g. Physics, Chemistry):",
      value: "",
      onSubmit: async (name) => {
        if (!name || !name.trim()) return;
        try {
          await adminAPI.createQuestionCategory({
            name: name.trim(),
            classId: classId !== 'general' ? classId : undefined,
            className: classId !== 'general' ? className : undefined
          });
          toast.success("Subject created!");
          fetchData();
        } catch (err) {
          toast.error(err.response?.data?.message || "Failed to create subject");
        }
      }
    });
  };

  const handleDeleteSubject = async (e, id) => {
    e.stopPropagation();
    setItemToDelete({
      name: "Subject",
      onConfirm: async () => {
        try {
          await adminAPI.deleteQuestionCategory(id);
          toast.success("Subject moved to Recycle Bin!");
          fetchData();
        } catch (err) {
          toast.error("Failed to delete");
        }
      }
    });
  };

  const handleRenameSubject = async (e, id, oldName) => {
    e.stopPropagation();
    setPromptModal({
      isOpen: true,
      title: "Enter new Subject name:",
      value: oldName,
      onSubmit: async (newName) => {
        if (!newName || newName === oldName) return;
        try {
          await adminAPI.renameQuestionCategory(id, { name: newName });
          toast.success("Subject renamed!");
          fetchData();
        } catch (err) {
          toast.error(err.response?.data?.message || "Failed to rename subject");
        }
      }
    });
  };

  const handleRenameSubFolder = async (e, type, id, oldName) => {
    e.stopPropagation();
    setPromptModal({
      isOpen: true,
      title: `Enter new ${type} name:`,
      value: oldName,
      onSubmit: async (newName) => {
        if (!newName || newName === oldName) return;
        try {
          if (type === 'chapter') await adminAPI.renameQuestionChapter(id, { name: newName });
          else if (type === 'topic') await adminAPI.renameQuestionTopic(id, { name: newName });
          toast.success(`${type} renamed!`);
          fetchData(); // re-fetch hierarchy
        } catch (err) {
          toast.error("Failed to rename");
        }
      }
    });
  };

  // Full / Part Paper Operations
  const handlePaperClick = async (paper, bankType) => {
    try {
      const res = await adminAPI.getQuestionBankById(paper._id);
      const data = res.data?.data;
      if (data) {
        if (bankType === 'PART_PAPER') {
          setPartPaperData(data);
          setPartPaperPath([partPaperPath[0], paper]);
        } else {
          setFullPaperData(data);
          setFullPaperPath([fullPaperPath[0], paper]);
        }
      }
    } catch (err) {
      toast.error('Failed to load paper details');
    }
  };

  const handleCreatePaper = async (bankType, classId, className) => {
    const isPart = bankType === 'PART_PAPER';
    const paperLabel = isPart ? 'Part Paper' : 'Full Paper';
    setPromptModal({
      isOpen: true,
      title: `Enter new ${paperLabel} name (e.g. ${isPart ? 'Mechanics Part 1' : 'JEE Mock Test 1'}):`,
      value: "",
      onSubmit: async (name) => {
        if (!name || !name.trim()) return;
        try {
          await adminAPI.createQuestionBank({
            title: name.trim(),
            bankType: bankType,
            classId: (classId && classId !== 'general') ? classId : undefined,
            className: (classId && classId !== 'general') ? className : undefined,
            description: '',
            questions: []
          });
          toast.success(`${paperLabel} Folder created!`);
          if (isPart) fetchPartPapers();
          else fetchFullPapers();
        } catch (err) {
          toast.error(err.response?.data?.message || `Failed to create ${paperLabel}. Make sure server is restarted.`);
        }
      }
    });
  };

  const handleRenamePaper = async (e, id, oldTitle, bankType) => {
    e.stopPropagation();
    const isPart = bankType === 'PART_PAPER';
    const paperLabel = isPart ? 'Part Paper' : 'Full Paper';
    setPromptModal({
      isOpen: true,
      title: `Enter new ${paperLabel} name:`,
      value: oldTitle,
      onSubmit: async (newTitle) => {
        if (!newTitle || newTitle === oldTitle) return;
        try {
          await adminAPI.renameQuestionBank(id, { title: newTitle });
          toast.success(`${paperLabel} renamed!`);
          if (isPart) fetchPartPapers();
          else fetchFullPapers();
        } catch (err) {
          toast.error(err.response?.data?.message || `Failed to rename ${paperLabel}`);
        }
      }
    });
  };

  const handleDeletePaper = (e, paper, bankType) => {
    e.stopPropagation();
    const isPart = bankType === 'PART_PAPER';
    const paperLabel = isPart ? 'Part Paper' : 'Full Paper';
    setItemToDelete({
      name: `${paperLabel} "${paper.title}"`,
      onConfirm: async () => {
        try {
          await adminAPI.deleteQuestionBank(paper._id);
          toast.success(`${paperLabel} moved to Recycle Bin!`);
          if (isPart) fetchPartPapers();
          else fetchFullPapers();
        } catch (err) {
          toast.error(`Failed to move ${paperLabel}`);
        }
      }
    });
  };

  // Paper Inner Folder Handlers (Subject / Chapter / Topic in Full or Part Paper)
  const getActivePaperDataAndSetter = () => {
    if (activeTab === 'PART_PAPERS') {
      return { data: partPaperData, setter: setPartPaperData };
    }
    return { data: fullPaperData, setter: setFullPaperData };
  };

  const handleRenamePaperSubject = async (e, oldSubjectName) => {
    e.stopPropagation();
    const { data: paperData, setter: setPaperData } = getActivePaperDataAndSetter();
    if (!paperData) return;
    setPromptModal({
      isOpen: true,
      title: "Enter new Subject name:",
      value: oldSubjectName,
      onSubmit: async (newSubjectName) => {
        if (!newSubjectName || newSubjectName === oldSubjectName) return;
        try {
          const newQuestions = paperData.questions.map(q => {
            if ((q.subjectName || 'General') === oldSubjectName) {
              return { ...q, subjectName: newSubjectName };
            }
            return q;
          });
          await adminAPI.updateQuestionBank(paperData._id, { questions: newQuestions });
          toast.success("Subject renamed!");
          setPaperData({ ...paperData, questions: newQuestions });
        } catch (err) {
          toast.error("Failed to rename subject");
        }
      }
    });
  };

  const handleTogglePublishPaperSubject = async (subjectName, currentlyUnpublished) => {
    const { data: paperData, setter: setPaperData } = getActivePaperDataAndSetter();
    if (!paperData) return;
    try {
      const newQuestions = paperData.questions.map(q => {
        if ((q.subjectName || 'General') === subjectName) {
          return { ...q, isUnpublished: !currentlyUnpublished };
        }
        return q;
      });
      await adminAPI.updateQuestionBank(paperData._id, { questions: newQuestions });
      toast.success(currentlyUnpublished ? "Subject Published!" : "Subject Unpublished!");
      setPaperData({ ...paperData, questions: newQuestions });
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleDeletePaperSubject = async (subjectName) => {
    const { data: paperData, setter: setPaperData } = getActivePaperDataAndSetter();
    if (!paperData) return;
    setItemToDelete({
      name: `Subject ${subjectName}`,
      onConfirm: async () => {
        try {
          const newQuestions = paperData.questions.filter(q => (q.subjectName || 'General') !== subjectName);
          await adminAPI.updateQuestionBank(paperData._id, { questions: newQuestions });
          toast.success("Subject moved to Recycle Bin!");
          setPaperData({ ...paperData, questions: newQuestions });
        } catch (err) {
          toast.error("Failed to delete subject");
        }
      }
    });
  };

  const handleRenamePaperChapter = async (e, subjectName, oldChapterName) => {
    e.stopPropagation();
    const { data: paperData, setter: setPaperData } = getActivePaperDataAndSetter();
    if (!paperData) return;
    setPromptModal({
      isOpen: true,
      title: "Enter new Chapter name:",
      value: oldChapterName,
      onSubmit: async (newChapterName) => {
        if (!newChapterName || newChapterName === oldChapterName) return;
        try {
          const newQuestions = paperData.questions.map(q => {
            if ((q.subjectName || 'General') === subjectName && (q.chapterName || 'General') === oldChapterName) {
              return { ...q, chapterName: newChapterName };
            }
            return q;
          });
          await adminAPI.updateQuestionBank(paperData._id, { questions: newQuestions });
          toast.success("Chapter renamed!");
          setPaperData({ ...paperData, questions: newQuestions });
        } catch (err) {
          toast.error("Failed to rename chapter");
        }
      }
    });
  };

  const handleTogglePublishPaperChapter = async (subjectName, chapterName, currentlyUnpublished) => {
    const { data: paperData, setter: setPaperData } = getActivePaperDataAndSetter();
    if (!paperData) return;
    try {
      const newQuestions = paperData.questions.map(q => {
        if ((q.subjectName || 'General') === subjectName && (q.chapterName || 'General') === chapterName) {
          return { ...q, isUnpublished: !currentlyUnpublished };
        }
        return q;
      });
      await adminAPI.updateQuestionBank(paperData._id, { questions: newQuestions });
      toast.success(currentlyUnpublished ? "Chapter Published!" : "Chapter Unpublished!");
      setPaperData({ ...paperData, questions: newQuestions });
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleDeletePaperChapter = async (subjectName, chapterName) => {
    const { data: paperData, setter: setPaperData } = getActivePaperDataAndSetter();
    if (!paperData) return;
    setItemToDelete({
      name: `Chapter ${chapterName}`,
      onConfirm: async () => {
        try {
          const newQuestions = paperData.questions.filter(q => !((q.subjectName || 'General') === subjectName && (q.chapterName || 'General') === chapterName));
          await adminAPI.updateQuestionBank(paperData._id, { questions: newQuestions });
          toast.success("Chapter moved to Recycle Bin!");
          setPaperData({ ...paperData, questions: newQuestions });
        } catch (err) {
          toast.error("Failed to delete chapter");
        }
      }
    });
  };

  const handleRenamePaperTopic = async (e, subjectName, chapterName, oldTopicName) => {
    e.stopPropagation();
    const { data: paperData, setter: setPaperData } = getActivePaperDataAndSetter();
    if (!paperData) return;
    setPromptModal({
      isOpen: true,
      title: "Enter new Topic name:",
      value: oldTopicName,
      onSubmit: async (newTopicName) => {
        if (!newTopicName || newTopicName === oldTopicName) return;
        try {
          const newQuestions = paperData.questions.map(q => {
            if ((q.subjectName || 'General') === subjectName && 
                (q.chapterName || 'General') === chapterName && 
                (q.topicName || 'General') === oldTopicName) {
              return { ...q, topicName: newTopicName };
            }
            return q;
          });
          await adminAPI.updateQuestionBank(paperData._id, { questions: newQuestions });
          toast.success("Topic renamed!");
          setPaperData({ ...paperData, questions: newQuestions });
        } catch (err) {
          toast.error("Failed to rename topic");
        }
      }
    });
  };

  const handleTogglePublishPaperTopic = async (subjectName, chapterName, topicName, currentlyUnpublished) => {
    const { data: paperData, setter: setPaperData } = getActivePaperDataAndSetter();
    if (!paperData) return;
    try {
      const newQuestions = paperData.questions.map(q => {
        if ((q.subjectName || 'General') === subjectName && (q.chapterName || 'General') === chapterName && (q.topicName || 'General') === topicName) {
          return { ...q, isUnpublished: !currentlyUnpublished };
        }
        return q;
      });
      await adminAPI.updateQuestionBank(paperData._id, { questions: newQuestions });
      toast.success(currentlyUnpublished ? "Topic Published!" : "Topic Unpublished!");
      setPaperData({ ...paperData, questions: newQuestions });
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleDeletePaperTopic = async (subjectName, chapterName, topicName) => {
    const { data: paperData, setter: setPaperData } = getActivePaperDataAndSetter();
    if (!paperData) return;
    setItemToDelete({
      name: `Topic ${topicName}`,
      onConfirm: async () => {
        try {
          const newQuestions = paperData.questions.filter(q => !((q.subjectName || 'General') === subjectName && (q.chapterName || 'General') === chapterName && (q.topicName || 'General') === topicName));
          await adminAPI.updateQuestionBank(paperData._id, { questions: newQuestions });
          toast.success("Topic moved to Recycle Bin!");
          setPaperData({ ...paperData, questions: newQuestions });
        } catch (err) {
          toast.error("Failed to delete topic");
        }
      }
    });
  };

  // Path Navigation
  const navigateTo = (levelData) => {
    setPath([...path, levelData]);
  };

  useEffect(() => {
    if (path.length === 4) { // Inside a topic (Level 4: Class -> Subject -> Chapter -> Topic)
      fetchTopicQuestions();
    }
  }, [path]);

  const fetchTopicQuestions = async () => {
    if (path.length !== 4) return;
    try {
      setLoadingQuestions(true);
      const res = await adminAPI.getQuestionsByHierarchy({
        classId: path[0].id !== 'general' ? path[0].id : undefined,
        subject: path[1].id,
        chapter: path[2].id,
        topic: path[3].id
      });
      setTopicQuestions(res.data?.data || []);
    } catch (err) {
      toast.error('Failed to load questions');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const navigateToCrumb = (index) => {
    setPath(path.slice(0, index + 1));
  };

  const handleBack = () => {
    if (activeTab === 'CLASS_FOLDERS' && path.length > 0) {
      setPath(path.slice(0, -1));
    } else if (activeTab === 'FULL_PAPERS' && fullPaperPath.length > 0) {
      setFullPaperPath(fullPaperPath.slice(0, -1));
    } else if (activeTab === 'PART_PAPERS' && partPaperPath.length > 0) {
      setPartPaperPath(partPaperPath.slice(0, -1));
    }
  };

  // Renderers
  const renderRoot = () => {
    // Merge subjects from API with hierarchy stats
    const displaySubjects = subjects.map(sub => {
      const hNode = hierarchy.find(h => h._id === sub._id);
      return {
        ...sub,
        count: hNode ? hNode.count : 0,
        difficulties: hNode ? hNode.difficulties : { Easy: 0, Medium: 0, Hard: 0 },
        hNode
      };
    });

    // Compute display classes
    const displayClasses = classes.map(cls => {
      const classSubjects = displaySubjects.filter(sub => {
        const subClassId = sub.class?._id || sub.class;
        return subClassId === cls._id;
      });
      const count = classSubjects.reduce((sum, s) => sum + (s.count || 0), 0);
      const difficulties = {
        Easy: classSubjects.reduce((sum, s) => sum + (s.difficulties?.Easy || 0), 0),
        Medium: classSubjects.reduce((sum, s) => sum + (s.difficulties?.Medium || 0), 0),
        Hard: classSubjects.reduce((sum, s) => sum + (s.difficulties?.Hard || 0), 0)
      };
      return {
        ...cls,
        count,
        difficulties,
        subjectCount: classSubjects.length
      };
    });

    // Unassigned subjects (fallback for existing subjects without class)
    const unassignedSubjects = displaySubjects.filter(sub => {
      const subClassId = sub.class?._id || sub.class;
      return !subClassId || !classes.some(c => c._id === subClassId);
    });

    if (unassignedSubjects.length > 0) {
      const unassignedCount = unassignedSubjects.reduce((sum, s) => sum + (s.count || 0), 0);
      const unassignedDiffs = {
        Easy: unassignedSubjects.reduce((sum, s) => sum + (s.difficulties?.Easy || 0), 0),
        Medium: unassignedSubjects.reduce((sum, s) => sum + (s.difficulties?.Medium || 0), 0),
        Hard: unassignedSubjects.reduce((sum, s) => sum + (s.difficulties?.Hard || 0), 0)
      };
      displayClasses.push({
        _id: 'general',
        name: 'General / Other Classes',
        count: unassignedCount,
        difficulties: unassignedDiffs,
        subjectCount: unassignedSubjects.length,
        isGeneral: true
      });
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayClasses.map(cls => (
            <Card 
              key={cls._id} 
              className={`p-4 cursor-pointer hover:shadow-md transition-all group border-l-4 ${cls.count === 0 ? 'border-l-gray-300 opacity-70' : 'border-l-primary-500'}`}
              onClick={() => navigateTo({ type: 'CLASS', id: cls._id, name: cls.name })}
            >
              <div className="flex justify-between items-start mb-2">
                <Folder className={`w-8 h-8 ${cls.count === 0 ? 'text-gray-400' : 'text-primary-500'}`} />
                {!cls.isGeneral && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ActionMenu actions={[
                      { label: 'Edit', icon: Edit, onClick: (e) => handleRenameClass(e, cls._id, cls.name) },
                      { label: 'Move to Recycle Bin', icon: Trash2, danger: true, onClick: (e) => handleDeleteClass(e, cls._id, cls.name) }
                    ]} />
                  </div>
                )}
              </div>
              <h3 className="font-bold text-lg text-gray-800 line-clamp-1">{cls.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{cls.subjectCount} Subjects • {cls.count} Questions</p>
              {cls.count > 0 && (
                <div className="flex gap-2 mt-3 text-xs font-semibold">
                  {cls.difficulties.Easy > 0 && <span className="text-success-600 bg-success-50 px-2 py-0.5 rounded">E: {cls.difficulties.Easy}</span>}
                  {cls.difficulties.Medium > 0 && <span className="text-warning-600 bg-warning-50 px-2 py-0.5 rounded">M: {cls.difficulties.Medium}</span>}
                  {cls.difficulties.Hard > 0 && <span className="text-error-600 bg-error-50 px-2 py-0.5 rounded">H: {cls.difficulties.Hard}</span>}
                </div>
              )}
            </Card>
          ))}
          <div 
            onClick={handleCreateClass}
            className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-primary-600 hover:border-primary-300 cursor-pointer transition-colors min-h-[120px]"
          >
            <Plus className="w-8 h-8 mb-2" />
            <span className="font-medium">Create Class Folder</span>
          </div>
        </div>
      </div>
    );
  };

  const renderClassSubjects = (classId) => {
    const displaySubjects = subjects.map(sub => {
      const hNode = hierarchy.find(h => h._id === sub._id);
      return {
        ...sub,
        count: hNode ? hNode.count : 0,
        difficulties: hNode ? hNode.difficulties : { Easy: 0, Medium: 0, Hard: 0 },
        hNode
      };
    });

    const classSubjects = displaySubjects.filter(sub => {
      const subClassId = sub.class?._id || sub.class;
      if (classId === 'general') {
        return !subClassId || !classes.some(c => c._id === subClassId);
      }
      return subClassId === classId;
    });

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {classSubjects.map(sub => (
            <Card 
              key={sub._id} 
              className={`p-4 cursor-pointer hover:shadow-md transition-all group border-l-4 ${sub.count === 0 ? 'border-l-gray-300 opacity-70' : 'border-l-primary-500'}`}
              onClick={() => navigateTo({ type: 'SUBJECT', id: sub._id, name: sub.name, ref: sub.hNode })}
            >
              <div className="flex justify-between items-start mb-2">
                <Folder className={`w-8 h-8 ${sub.count === 0 ? 'text-gray-400' : 'text-primary-500'}`} />
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <ActionMenu actions={[
                    { label: 'Edit', icon: Edit, onClick: (e) => handleRenameSubject(e, sub._id, sub.name) },
                    { label: 'Move to Recycle Bin', icon: Trash2, danger: true, onClick: (e) => handleDeleteSubject(e, sub._id) }
                  ]} />
                </div>
              </div>
              <h3 className="font-bold text-lg text-gray-800 line-clamp-1">{sub.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{sub.count} Questions</p>
              {sub.count > 0 && (
                <div className="flex gap-2 mt-3 text-xs font-semibold">
                  {sub.difficulties.Easy > 0 && <span className="text-success-600 bg-success-50 px-2 py-0.5 rounded">E: {sub.difficulties.Easy}</span>}
                  {sub.difficulties.Medium > 0 && <span className="text-warning-600 bg-warning-50 px-2 py-0.5 rounded">M: {sub.difficulties.Medium}</span>}
                  {sub.difficulties.Hard > 0 && <span className="text-error-600 bg-error-50 px-2 py-0.5 rounded">H: {sub.difficulties.Hard}</span>}
                </div>
              )}
            </Card>
          ))}
          <div 
            onClick={() => handleCreateSubject(classId, path[0]?.name)}
            className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-primary-600 hover:border-primary-300 cursor-pointer transition-colors min-h-[120px]"
          >
            <Plus className="w-8 h-8 mb-2" />
            <span className="font-medium">Create Subject Folder</span>
          </div>
        </div>
      </div>
    );
  };

  const renderChapters = (subjectNode) => {
    if (!subjectNode || !subjectNode.chapters || subjectNode.chapters.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <FolderOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p>No chapters found in this subject.</p>
          <p className="text-sm">Click "Upload Questions" to import a document.</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {subjectNode.chapters.map(ch => (
          <Card 
            key={ch._id} 
            className={`p-4 cursor-pointer hover:shadow-md transition-all border-l-4 relative group ${ch.isUnpublished ? 'border-l-gray-300 opacity-60' : 'border-l-blue-400'}`}
            onClick={() => navigateTo({ type: 'CHAPTER', id: ch._id, name: ch.name, ref: ch })}
          >
            <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
              <ActionMenu actions={[
                { label: 'Edit', icon: Edit, onClick: (e) => handleRenameSubFolder(e, 'chapter', ch._id, ch.name) },
                { label: ch.isUnpublished ? 'Publish' : 'Unpublish', icon: ch.isUnpublished ? Eye : EyeOff, onClick: (e) => handleTogglePublish(e, 'chapter', ch._id, ch.isUnpublished) },
                { label: 'Move to Recycle Bin', icon: Trash2, danger: true, onClick: (e) => handleDeleteSubFolder(e, 'chapter', ch._id) }
              ]} />
            </div>
            <Folder className={`w-8 h-8 mb-2 ${ch.isUnpublished ? 'text-gray-400' : 'text-blue-400'}`} />
            <h3 className="font-bold text-gray-800 line-clamp-1">{ch.name} {ch.isUnpublished && <span className="text-xs text-red-500 font-normal ml-2">(Unpublished)</span>}</h3>
            <p className="text-sm text-gray-500 mt-1">{ch.count} Questions</p>
            {ch.count > 0 && (
              <div className="flex gap-2 mt-3 text-xs font-semibold">
                {ch.difficulties.Easy > 0 && <span className="text-success-600 bg-success-50 px-2 py-0.5 rounded">E: {ch.difficulties.Easy}</span>}
                {ch.difficulties.Medium > 0 && <span className="text-warning-600 bg-warning-50 px-2 py-0.5 rounded">M: {ch.difficulties.Medium}</span>}
                {ch.difficulties.Hard > 0 && <span className="text-error-600 bg-error-50 px-2 py-0.5 rounded">H: {ch.difficulties.Hard}</span>}
              </div>
            )}
          </Card>
        ))}
      </div>
    );
  };

  const renderTopics = (chapterNode) => {
    if (!chapterNode || !chapterNode.topics || chapterNode.topics.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <FolderOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p>No topics found in this chapter.</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {chapterNode.topics.map(t => (
          <Card 
            key={t._id} 
            className={`p-4 cursor-pointer hover:shadow-md transition-all border-l-4 relative group ${t.isUnpublished ? 'border-l-gray-300 opacity-60' : 'border-l-purple-400'}`}
            onClick={() => navigateTo({ type: 'TOPIC', id: t._id, name: t.name, ref: t })}
          >
            <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
              <ActionMenu actions={[
                { label: 'Edit', icon: Edit, onClick: (e) => handleRenameSubFolder(e, 'topic', t._id, t.name) },
                { label: t.isUnpublished ? 'Publish' : 'Unpublish', icon: t.isUnpublished ? Eye : EyeOff, onClick: (e) => handleTogglePublish(e, 'topic', t._id, t.isUnpublished) },
                { label: 'Move to Recycle Bin', icon: Trash2, danger: true, onClick: (e) => handleDeleteSubFolder(e, 'topic', t._id) }
              ]} />
            </div>
            <Folder className={`w-8 h-8 mb-2 ${t.isUnpublished ? 'text-gray-400' : 'text-purple-400'}`} />
            <h3 className="font-bold text-gray-800 line-clamp-1">{t.name} {t.isUnpublished && <span className="text-xs text-red-500 font-normal ml-2">(Unpublished)</span>}</h3>
            <p className="text-sm text-gray-500 mt-1">{t.count} Questions</p>
            {t.count > 0 && (
              <div className="flex gap-2 mt-3 text-xs font-semibold">
                {t.difficulties.Easy > 0 && <span className="text-success-600 bg-success-50 px-2 py-0.5 rounded">E: {t.difficulties.Easy}</span>}
                {t.difficulties.Medium > 0 && <span className="text-warning-600 bg-warning-50 px-2 py-0.5 rounded">M: {t.difficulties.Medium}</span>}
                {t.difficulties.Hard > 0 && <span className="text-error-600 bg-error-50 px-2 py-0.5 rounded">H: {t.difficulties.Hard}</span>}
              </div>
            )}
          </Card>
        ))}
      </div>
    );
  };

  const renderQuestions = (topicId) => {
    if (loadingQuestions) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      );
    }

    if (topicQuestions.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p>No questions found in this topic.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {topicQuestions.map((q, idx) => (
          <Card key={q._id || idx} className="p-4 border border-gray-100 hover:shadow-sm transition-shadow relative group">
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
              <Button variant="outline" size="sm" className="flex items-center gap-1 py-1 px-2 h-7" onClick={() => handleEditClick(q)}>
                <Edit2 className="w-3 h-3" /> Edit
              </Button>
              <Button variant="outline" size="sm" className="flex items-center gap-1 py-1 px-2 h-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteQuestion(q._id, q.bankId)}>
                <Trash2 className="w-3 h-3" /> Delete
              </Button>
            </div>
            <div className="flex justify-between items-start mb-2">
              <span className="font-semibold text-gray-500 text-sm">Q{idx + 1}.</span>
              <div className="flex items-center gap-2 mr-32">
                <span className={`text-xs px-2 py-1 rounded font-semibold ${
                  q.difficulty === 'Easy' ? 'bg-success-50 text-success-600' :
                  q.difficulty === 'Hard' ? 'bg-error-50 text-error-600' :
                  'bg-warning-50 text-warning-600'
                }`}>
                  {q.difficulty}
                </span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-semibold">
                  {q.marks} Marks
                </span>
              </div>
            </div>
            
            <div className="text-gray-800 font-medium mb-4 pr-32" dangerouslySetInnerHTML={{ __html: q.questionText }} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6">
              {q.options?.map((opt, oIdx) => (
                <div key={oIdx} className={`p-3 rounded-lg border ${opt.isCorrect ? 'bg-success-50 border-success-200' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-center">
                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold mr-3 ${opt.isCorrect ? 'bg-success-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {String.fromCharCode(65 + oIdx)}
                    </span>
                    <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: opt.text }} />
                  </div>
                </div>
              ))}
            </div>

            {q.explanation && (
              <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-sm rounded border border-blue-100">
                <strong>Solution:</strong>
                <div dangerouslySetInnerHTML={{ __html: q.explanation }} className="mt-1" />
              </div>
            )}
          </Card>
        ))}
      </div>
    );
  };

  // Reusable Paper Tab Renderer for Full Papers & Part Papers
  // Level 0: Class Folders for this paper type
  // Level 1: Papers in the selected Class
  // Level 2: Subjects in the selected Paper
  // Level 3: Chapters in the selected Subject
  // Level 4: Topics in the selected Chapter
  // Level 5: Questions in the selected Topic
  const renderPaperTab = (bankType) => {
    const isPart = bankType === 'PART_PAPER';
    const paperList = isPart ? partPapers : fullPapers;
    const loadingPapers = isPart ? loadingPartPapers : loadingFullPapers;
    const paperPath = isPart ? partPaperPath : fullPaperPath;
    const setPaperPath = isPart ? setPartPaperPath : setFullPaperPath;
    const paperData = isPart ? partPaperData : fullPaperData;
    const paperTypeName = isPart ? 'Part Paper' : 'Full Paper';
    const borderColor = isPart ? 'border-l-indigo-500' : 'border-l-blue-500';
    const iconColor = isPart ? 'text-indigo-500' : 'text-blue-500';
    const subBorderColor = isPart ? 'border-l-indigo-400' : 'border-l-blue-400';
    const subIconColor = isPart ? 'text-indigo-400' : 'text-blue-400';

    // Level 0: Class Folders for Papers
    if (paperPath.length === 0) {
      const displayClasses = classes.map(cls => {
        const classPapers = paperList.filter(p => {
          const pClassId = p.class?._id || p.class;
          return pClassId === cls._id;
        });
        const papersCount = classPapers.length;
        const questionsCount = classPapers.reduce((sum, p) => sum + (p.totalQuestions || 0), 0);
        const marksCount = classPapers.reduce((sum, p) => sum + (p.totalMarks || 0), 0);
        return {
          ...cls,
          papersCount,
          questionsCount,
          marksCount
        };
      });

      const unassignedPapers = paperList.filter(p => {
        const pClassId = p.class?._id || p.class;
        return !pClassId || !classes.some(c => c._id === pClassId);
      });

      if (unassignedPapers.length > 0) {
        displayClasses.push({
          _id: 'general',
          name: 'General / Other Classes',
          papersCount: unassignedPapers.length,
          questionsCount: unassignedPapers.reduce((sum, p) => sum + (p.totalQuestions || 0), 0),
          marksCount: unassignedPapers.reduce((sum, p) => sum + (p.totalMarks || 0), 0),
          isGeneral: true
        });
      }

      return (
        <div className="space-y-4">
          {loadingPapers ? (
            <p className="text-gray-500">Loading {paperTypeName.toLowerCase()} classes...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayClasses.map(cls => (
                <Card 
                  key={cls._id} 
                  className={`p-4 border-l-4 ${cls.papersCount === 0 ? 'border-l-gray-300 opacity-70' : borderColor} relative group cursor-pointer hover:shadow-md transition-shadow`}
                  onClick={() => setPaperPath([{ type: 'CLASS', id: cls._id, name: cls.name }])}
                >
                  <div className="flex justify-between items-start mb-2">
                    <Folder className={`w-8 h-8 ${cls.papersCount === 0 ? 'text-gray-400' : iconColor}`} />
                    {!cls.isGeneral && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <ActionMenu actions={[
                          { label: 'Edit', icon: Edit, onClick: (e) => handleRenameClass(e, cls._id, cls.name) },
                          { label: 'Move to Recycle Bin', icon: Trash2, danger: true, onClick: (e) => handleDeleteClass(e, cls._id, cls.name) }
                        ]} />
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-lg text-gray-800 pr-6 truncate">{cls.name}</h3>
                  <p className="text-sm text-gray-500 mt-2">{cls.papersCount} {paperTypeName}s • {cls.questionsCount} Questions</p>
                  <p className="text-sm text-gray-500 mt-1">{cls.marksCount} Total Marks</p>
                </Card>
              ))}
              <div 
                onClick={handleCreateClass}
                className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-primary-600 hover:border-primary-300 cursor-pointer transition-colors min-h-[120px]"
              >
                <Plus className="w-8 h-8 mb-2" />
                <span className="font-medium">Create Class Folder</span>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Level 1: Papers in the selected Class
    if (paperPath.length === 1) {
      const selectedClass = paperPath[0];
      const classPapers = paperList.filter(p => {
        const pClassId = p.class?._id || p.class;
        if (selectedClass.id === 'general') {
          return !pClassId || !classes.some(c => c._id === pClassId);
        }
        return pClassId === selectedClass.id;
      });

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classPapers.map(paper => (
              <Card 
                key={paper._id} 
                className={`p-4 border-l-4 ${borderColor} relative group cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => handlePaperClick(paper, bankType)}
              >
                <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ActionMenu actions={[
                    { label: 'Edit', icon: Edit, onClick: (e) => handleRenamePaper(e, paper._id, paper.title, bankType) },
                    { 
                      label: 'Move to Recycle Bin', 
                      icon: Trash2, 
                      danger: true, 
                      onClick: (e) => handleDeletePaper(e, paper, bankType)
                    }
                  ]} />
                </div>
                <div className="flex items-center space-x-2 mb-2">
                  <Folder className={`w-6 h-6 ${iconColor}`} />
                  <h3 className="font-bold text-lg text-gray-800 pr-6 truncate">{paper.title}</h3>
                </div>
                <p className="text-sm text-gray-500 mt-2">{paper.totalQuestions} Questions</p>
                <p className="text-sm text-gray-500 mt-1">{paper.totalMarks} Total Marks</p>
                <p className="text-xs text-gray-400 mt-3">Uploaded on: {new Date(paper.createdAt).toLocaleDateString()}</p>
              </Card>
            ))}
            <div 
              onClick={() => handleCreatePaper(bankType, selectedClass.id, selectedClass.name)}
              className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-primary-600 hover:border-primary-300 cursor-pointer transition-colors min-h-[120px]"
            >
              <Plus className="w-8 h-8 mb-2" />
              <span className="font-medium">Create {paperTypeName} Folder</span>
            </div>
          </div>
        </div>
      );
    }

    // Level 2: List subjects in the selected Paper
    if (paperPath.length === 2 && paperData) {
      const questions = paperData.questions || [];
      const subjectsMap = {};
      questions.forEach(q => {
        const sName = q.subjectName || 'General';
        if (!subjectsMap[sName]) subjectsMap[sName] = { name: sName, count: 0, marks: 0, unpublished: true };
        subjectsMap[sName].count += 1;
        subjectsMap[sName].marks += Number(q.marks) || 0;
        if (!q.isUnpublished) subjectsMap[sName].unpublished = false;
      });
      const paperSubjects = Object.values(subjectsMap);

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {paperSubjects.map((sub: any) => (
              <Card 
                key={sub.name} 
                className={`p-4 cursor-pointer hover:shadow-md transition-all border-l-4 relative group ${sub.unpublished ? 'border-l-gray-300 opacity-60' : subBorderColor}`}
                onClick={() => setPaperPath([...paperPath, sub.name])}
              >
                <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ActionMenu actions={[
                    { label: 'Edit', icon: Edit, onClick: (e) => handleRenamePaperSubject(e, sub.name) },
                    { label: sub.unpublished ? 'Publish' : 'Unpublish', icon: sub.unpublished ? Eye : EyeOff, onClick: (e) => { e.stopPropagation(); handleTogglePublishPaperSubject(sub.name, sub.unpublished); } },
                    { label: 'Move to Recycle Bin', icon: Trash2, danger: true, onClick: (e) => { e.stopPropagation(); handleDeletePaperSubject(sub.name); } }
                  ]} />
                </div>
                <Folder className={`w-8 h-8 mb-2 ${sub.unpublished ? 'text-gray-400' : subIconColor}`} />
                <h3 className="font-bold text-lg text-gray-800 line-clamp-1">{sub.name} {sub.unpublished && <span className="text-xs text-red-500 font-normal ml-2">(Unpublished)</span>}</h3>
                <p className="text-sm text-gray-500 mt-1">{sub.count} Questions</p>
                <p className="text-sm text-gray-500">{sub.marks} Marks</p>
              </Card>
            ))}
          </div>
        </div>
      );
    }

    // Level 3: List chapters in the subject
    if (paperPath.length === 3 && paperData) {
      const subjectName = paperPath[2];
      const questions = (paperData.questions || []).filter(q => (q.subjectName || 'General') === subjectName);
      const chaptersMap = {};
      questions.forEach(q => {
        const cName = q.chapterName || 'General';
        if (!chaptersMap[cName]) chaptersMap[cName] = { name: cName, count: 0, marks: 0, unpublished: true };
        chaptersMap[cName].count += 1;
        chaptersMap[cName].marks += Number(q.marks) || 0;
        if (!q.isUnpublished) chaptersMap[cName].unpublished = false;
      });
      const subjectChapters = Object.values(chaptersMap);

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {subjectChapters.map((ch: any) => (
              <Card 
                key={ch.name} 
                className={`p-4 cursor-pointer hover:shadow-md transition-all border-l-4 relative group ${ch.unpublished ? 'border-l-gray-300 opacity-60' : subBorderColor}`}
                onClick={() => setPaperPath([...paperPath, ch.name])}
              >
                <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ActionMenu actions={[
                    { label: 'Edit', icon: Edit, onClick: (e) => handleRenamePaperChapter(e, subjectName, ch.name) },
                    { label: ch.unpublished ? 'Publish' : 'Unpublish', icon: ch.unpublished ? Eye : EyeOff, onClick: (e) => { e.stopPropagation(); handleTogglePublishPaperChapter(subjectName, ch.name, ch.unpublished); } },
                    { label: 'Move to Recycle Bin', icon: Trash2, danger: true, onClick: (e) => { e.stopPropagation(); handleDeletePaperChapter(subjectName, ch.name); } }
                  ]} />
                </div>
                <Folder className={`w-8 h-8 mb-2 ${ch.unpublished ? 'text-gray-400' : subIconColor}`} />
                <h3 className="font-bold text-lg text-gray-800 line-clamp-1">{ch.name} {ch.unpublished && <span className="text-xs text-red-500 font-normal ml-2">(Unpublished)</span>}</h3>
                <p className="text-sm text-gray-500 mt-1">{ch.count} Questions</p>
                <p className="text-sm text-gray-500">{ch.marks} Marks</p>
              </Card>
            ))}
          </div>
        </div>
      );
    }

    // Level 4: List topics in the chapter
    if (paperPath.length === 4 && paperData) {
      const subjectName = paperPath[2];
      const chapterName = paperPath[3];
      const questions = (paperData.questions || []).filter(q => (q.subjectName || 'General') === subjectName && (q.chapterName || 'General') === chapterName);
      const topicsMap = {};
      questions.forEach(q => {
        const tName = q.topicName || 'General';
        if (!topicsMap[tName]) topicsMap[tName] = { name: tName, count: 0, marks: 0, unpublished: true };
        topicsMap[tName].count += 1;
        topicsMap[tName].marks += Number(q.marks) || 0;
        if (!q.isUnpublished) topicsMap[tName].unpublished = false;
      });
      const chapterTopics = Object.values(topicsMap);

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {chapterTopics.map((t: any) => (
              <Card 
                key={t.name} 
                className={`p-4 cursor-pointer hover:shadow-md transition-all border-l-4 relative group ${t.unpublished ? 'border-l-gray-300 opacity-60' : 'border-l-purple-400'}`}
                onClick={() => setPaperPath([...paperPath, t.name])}
              >
                <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ActionMenu actions={[
                    { label: 'Edit', icon: Edit, onClick: (e) => handleRenamePaperTopic(e, subjectName, chapterName, t.name) },
                    { label: t.unpublished ? 'Publish' : 'Unpublish', icon: t.unpublished ? Eye : EyeOff, onClick: (e) => { e.stopPropagation(); handleTogglePublishPaperTopic(subjectName, chapterName, t.name, t.unpublished); } },
                    { label: 'Move to Recycle Bin', icon: Trash2, danger: true, onClick: (e) => { e.stopPropagation(); handleDeletePaperTopic(subjectName, chapterName, t.name); } }
                  ]} />
                </div>
                <Folder className={`w-8 h-8 mb-2 ${t.unpublished ? 'text-gray-400' : 'text-purple-400'}`} />
                <h3 className="font-bold text-lg text-gray-800 line-clamp-1">{t.name} {t.unpublished && <span className="text-xs text-red-500 font-normal ml-2">(Unpublished)</span>}</h3>
                <p className="text-sm text-gray-500 mt-1">{t.count} Questions</p>
                <p className="text-sm text-gray-500">{t.marks} Marks</p>
              </Card>
            ))}
          </div>
        </div>
      );
    }

    // Level 5: List questions in the topic
    if (paperPath.length === 5 && paperData) {
      const subjectName = paperPath[2];
      const chapterName = paperPath[3];
      const topicName = paperPath[4];
      const questions = (paperData.questions || []).filter(q => 
         (q.subjectName || 'General') === subjectName && 
         (q.chapterName || 'General') === chapterName &&
         (q.topicName || 'General') === topicName
      );

      return (
        <div className="space-y-4">
          <div className="grid gap-4">
            {questions.map((q, idx) => (
              <Card key={idx} className="p-4 flex flex-col space-y-3 relative group">
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={() => handleEditClick(q, paperData._id)}>
                    <Edit2 className="w-3 h-3" /> Edit Question
                  </Button>
                  <Button variant="outline" size="sm" className="flex items-center gap-1 text-red-600 hover:bg-red-50" onClick={() => handleDeleteQuestion(q._id, paperData._id)}>
                    <Trash2 className="w-3 h-3" /> Delete
                  </Button>
                </div>
                <div className="flex justify-between items-start">
                  <div className="flex gap-2">
                    <span className="font-bold text-gray-700 w-8">Q{idx + 1}.</span>
                    <div className="text-gray-900 font-medium overflow-x-auto" dangerouslySetInnerHTML={{ __html: q.questionText }} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs pl-10">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-100 font-medium">
                    Topic: {q.topic?.name || q.topicName || 'General'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-gray-50 text-gray-700 border border-gray-200 font-medium">
                    Marks: {q.marks || 0} | Neg: {q.negativeMarks || 0}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full border font-medium ${
                    (q.difficulty || 'Medium') === 'Easy' ? 'bg-success-50 text-success-700 border-success-100' :
                    (q.difficulty || 'Medium') === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                    'bg-rose-50 text-rose-700 border-rose-100'
                  }`}>
                    Difficulty: {q.difficulty || 'Medium'}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-10 mt-3">
                  {q.options?.map((opt, oIdx) => (
                    <div key={oIdx} className={`p-3 rounded-lg border ${opt.isCorrect ? 'bg-success-50 border-success-200' : 'bg-white border-gray-200'}`}>
                      <div className="flex items-center">
                        <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold mr-3 ${opt.isCorrect ? 'bg-success-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                          {String.fromCharCode(65 + oIdx)}
                        </span>
                        <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: opt.text }} />
                      </div>
                    </div>
                  ))}
                </div>
                
                {q.explanation && (
                  <div className="ml-10 mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <p className="text-sm font-semibold text-blue-900 mb-1">Explanation:</p>
                    <div className="text-sm text-blue-800" dangerouslySetInnerHTML={{ __html: q.explanation }} />
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  const hasActivePath = (activeTab === 'CLASS_FOLDERS' && path.length > 0) || 
                        (activeTab === 'FULL_PAPERS' && fullPaperPath.length > 0) || 
                        (activeTab === 'PART_PAPERS' && partPaperPath.length > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Question Banks"
        subtitle="Organize questions by Class, Subject, Chapter, and Topic."
        actions={
          <div className="flex gap-2">
            <a href="/sample-template.docx" download>
              <Button variant="secondary" icon={FileText}>Sample Format</Button>
            </a>
            {activeTab === 'CLASS_FOLDERS' && path.length >= 2 && (
              <Button 
                icon={Upload} 
                onClick={() => router.push(`/admin/question-banks/create?classId=${path[0].id}&subjectId=${path[1].id}`)}
              >
                Edit / Upload Questions
              </Button>
            )}
            {activeTab === 'CLASS_FOLDERS' && path.length === 1 && (
              <Button 
                icon={Upload} 
                onClick={() => router.push(`/admin/question-banks/create?classId=${path[0].id}`)}
              >
                Upload Questions
              </Button>
            )}
            {activeTab === 'CLASS_FOLDERS' && path.length === 0 && (
              <Button 
                icon={Upload} 
                onClick={() => router.push(`/admin/question-banks/create`)}
              >
                Upload Questions
              </Button>
            )}

            {activeTab === 'FULL_PAPERS' && fullPaperPath.length >= 2 && (
              <Button 
                icon={Upload} 
                onClick={() => router.push(`/admin/question-banks/${fullPaperPath[1]._id}/edit?tab=FULL_PAPERS&classId=${fullPaperPath[0].id}`)}
              >
                Edit / Upload Questions
              </Button>
            )}
            {activeTab === 'FULL_PAPERS' && fullPaperPath.length === 1 && (
              <Button 
                icon={Upload} 
                onClick={() => router.push(`/admin/question-banks/create?tab=FULL_PAPERS&classId=${fullPaperPath[0].id}`)}
              >
                Upload Full Paper
              </Button>
            )}
            {activeTab === 'FULL_PAPERS' && fullPaperPath.length === 0 && (
              <Button 
                icon={Upload} 
                onClick={() => router.push(`/admin/question-banks/create?tab=FULL_PAPERS`)}
              >
                Upload Full Paper
              </Button>
            )}

            {activeTab === 'PART_PAPERS' && partPaperPath.length >= 2 && (
              <Button 
                icon={Upload} 
                onClick={() => router.push(`/admin/question-banks/${partPaperPath[1]._id}/edit?tab=PART_PAPERS&classId=${partPaperPath[0].id}`)}
              >
                Edit / Upload Questions
              </Button>
            )}
            {activeTab === 'PART_PAPERS' && partPaperPath.length === 1 && (
              <Button 
                icon={Upload} 
                onClick={() => router.push(`/admin/question-banks/create?tab=PART_PAPERS&classId=${partPaperPath[0].id}`)}
              >
                Upload Part Paper
              </Button>
            )}
            {activeTab === 'PART_PAPERS' && partPaperPath.length === 0 && (
              <Button 
                icon={Upload} 
                onClick={() => router.push(`/admin/question-banks/create?tab=PART_PAPERS`)}
              >
                Upload Part Paper
              </Button>
            )}
          </div>
        }
      />

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        {/* Tab Switcher (Visible when at root of tab) */}
        {!hasActivePath && (
          <div className="flex bg-gray-100 p-1 rounded-lg w-fit mb-6">
            <button
              className={`px-6 py-2 rounded-md font-medium text-sm transition-all ${
                activeTab === 'CLASS_FOLDERS'
                  ? 'bg-white shadow text-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => { setActiveTab('CLASS_FOLDERS'); setPath([]); }}
            >
              Class Folders
            </button>
            <button
              className={`px-6 py-2 rounded-md font-medium text-sm transition-all ${
                activeTab === 'FULL_PAPERS'
                  ? 'bg-white shadow text-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => { setActiveTab('FULL_PAPERS'); setFullPaperPath([]); }}
            >
              Full Papers
            </button>
            <button
              className={`px-6 py-2 rounded-md font-medium text-sm transition-all ${
                activeTab === 'PART_PAPERS'
                  ? 'bg-white shadow text-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => { setActiveTab('PART_PAPERS'); setPartPaperPath([]); }}
            >
              Part Papers
            </button>
          </div>
        )}

        {/* Breadcrumbs with Back Button */}
        <div className="flex items-center text-sm mb-6 pb-4 border-b">
          {hasActivePath && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleBack}
              className="flex items-center gap-1 mr-3 h-8 px-2.5 text-xs text-gray-700 hover:bg-gray-100 border-gray-300"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </Button>
          )}

          <div className="flex items-center flex-wrap gap-y-1">
            {activeTab === 'CLASS_FOLDERS' ? (
              <>
                <button 
                  onClick={() => setPath([])}
                  className={`flex items-center ${path.length === 0 ? 'font-bold text-primary-700' : 'text-gray-500 hover:text-primary-600'}`}
                >
                  Class Folders
                </button>
                
                {path.map((crumb, idx) => (
                  <div key={crumb.id || idx} className="flex items-center">
                    <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
                    <button 
                      onClick={() => navigateToCrumb(idx)}
                      className={`${idx === path.length - 1 ? 'font-bold text-primary-700' : 'text-gray-500 hover:text-primary-600'}`}
                    >
                      {crumb.name}
                    </button>
                  </div>
                ))}
              </>
            ) : activeTab === 'FULL_PAPERS' ? (
              <>
                <button 
                  onClick={() => setFullPaperPath([])}
                  className={`flex items-center ${fullPaperPath.length === 0 ? 'font-bold text-primary-700' : 'text-gray-500 hover:text-primary-600'}`}
                >
                  Full Papers
                </button>
                
                {fullPaperPath.map((crumb, idx) => (
                  <div key={idx} className="flex items-center">
                    <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
                    <button 
                      onClick={() => setFullPaperPath(fullPaperPath.slice(0, idx + 1))}
                      className={`${idx === fullPaperPath.length - 1 ? 'font-bold text-primary-700' : 'text-gray-500 hover:text-primary-600'}`}
                    >
                      {idx === 0 ? crumb.name : idx === 1 ? crumb.title : crumb}
                    </button>
                  </div>
                ))}
              </>
            ) : (
              <>
                <button 
                  onClick={() => setPartPaperPath([])}
                  className={`flex items-center ${partPaperPath.length === 0 ? 'font-bold text-primary-700' : 'text-gray-500 hover:text-primary-600'}`}
                >
                  Part Papers
                </button>
                
                {partPaperPath.map((crumb, idx) => (
                  <div key={idx} className="flex items-center">
                    <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
                    <button 
                      onClick={() => setPartPaperPath(partPaperPath.slice(0, idx + 1))}
                      className={`${idx === partPaperPath.length - 1 ? 'font-bold text-primary-700' : 'text-gray-500 hover:text-primary-600'}`}
                    >
                      {idx === 0 ? crumb.name : idx === 1 ? crumb.title : crumb}
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Content Renderers */}
        {loading ? (
          <div className="py-12 text-center text-gray-500">Loading folders...</div>
        ) : (
          <div className="min-h-[400px]">
            {activeTab === 'CLASS_FOLDERS' ? (
              <>
                {path.length === 0 && renderRoot()}
                {path.length === 1 && renderClassSubjects(path[0].id)}
                {path.length === 2 && renderChapters(path[1].ref)}
                {path.length === 3 && renderTopics(path[2].ref)}
                {path.length === 4 && renderQuestions(path[3].id)}
              </>
            ) : activeTab === 'FULL_PAPERS' ? (
              renderPaperTab('FULL_PAPER')
            ) : (
              renderPaperTab('PART_PAPER')
            )}
          </div>
        )}
      </div>

      {itemToDelete && (
        <DeleteModal
          isOpen={true}
          onClose={() => setItemToDelete(null)}
          onConfirm={async () => {
            setDeleting(true);
            await itemToDelete.onConfirm();
            setDeleting(false);
            setItemToDelete(null);
          }}
          itemName={itemToDelete?.name}
          loading={deleting}
        />
      )}

      {promptModal.isOpen && (
        <Modal isOpen={true} onClose={() => setPromptModal({ ...promptModal, isOpen: false })} size="md">
          <ModalHeader title={promptModal.title} subtitle="" onClose={() => setPromptModal({ ...promptModal, isOpen: false })} />
          <ModalBody className="py-4">
            <input
              type="text"
              autoFocus
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={promptModal.value}
              onChange={(e) => setPromptModal({ ...promptModal, value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  promptModal.onSubmit(promptModal.value);
                  setPromptModal({ ...promptModal, isOpen: false });
                }
              }}
            />
          </ModalBody>
          <ModalFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPromptModal({ ...promptModal, isOpen: false })}>Cancel</Button>
            <Button 
              variant="primary" 
              onClick={() => {
                promptModal.onSubmit(promptModal.value);
                setPromptModal({ ...promptModal, isOpen: false });
              }}
            >
              OK
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {isEditModalOpen && editingQuestion && (
        <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} size="xl">
          <ModalHeader title="Edit Question" subtitle="" onClose={() => setIsEditModalOpen(false)} />
          <ModalBody className="max-h-[70vh] overflow-y-auto">
            <div className="space-y-4 pb-12">
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2 p-3 bg-gray-50 border border-gray-200 rounded-lg shadow-inner">
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 block mb-1 uppercase tracking-wider">Subject</label>
                  <input type="text" className="w-full border border-gray-300 rounded p-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 bg-white" value={editingQuestion.subjectName || (typeof editingQuestion.subject === 'string' ? editingQuestion.subject : editingQuestion.subject?.name) || ''} onChange={(e) => setEditingQuestion({...editingQuestion, subjectName: e.target.value})} placeholder="Subject name" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 block mb-1 uppercase tracking-wider">Chapter</label>
                  <input type="text" className="w-full border border-gray-300 rounded p-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 bg-white" value={editingQuestion.chapterName || (typeof editingQuestion.chapter === 'string' ? editingQuestion.chapter : editingQuestion.chapter?.name) || ''} onChange={(e) => setEditingQuestion({...editingQuestion, chapterName: e.target.value})} placeholder="e.g. Kinematics" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 block mb-1 uppercase tracking-wider">Topic</label>
                  <input type="text" className="w-full border border-gray-300 rounded p-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 bg-white" value={editingQuestion.topicName || (typeof editingQuestion.topic === 'string' ? editingQuestion.topic : editingQuestion.topic?.name) || ''} onChange={(e) => setEditingQuestion({...editingQuestion, topicName: e.target.value})} placeholder="e.g. Motion in 1D" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 block mb-1 uppercase tracking-wider">Difficulty</label>
                  <select className="w-full border border-gray-300 rounded p-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 bg-white" value={editingQuestion.difficulty || 'Medium'} onChange={(e) => setEditingQuestion({...editingQuestion, difficulty: e.target.value})}>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 block">Question Text</label>
                <AdvancedEditor 
                  value={editingQuestion.questionText || ''}
                  onChange={(content) => setEditingQuestion({...editingQuestion, questionText: content})}
                />
              </div>

              <div className="space-y-4 mt-6">
                <div className="flex justify-between items-center border-b pb-1">
                  <label className="text-xs font-semibold text-gray-500 block">Options</label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="py-1 px-2 text-xs"
                    onClick={() => {
                      const newOpts = [...(editingQuestion.options || [])];
                      newOpts.push({ label: String.fromCharCode(65 + newOpts.length), text: '', isCorrect: false });
                      setEditingQuestion({...editingQuestion, options: newOpts});
                    }}
                  >
                    + Add Option
                  </Button>
                </div>
                {editingQuestion.options?.map((opt, oIdx) => (
                  <div key={oIdx} className="flex items-start gap-3">
                    <span className="font-bold w-6 text-center mt-2">{String.fromCharCode(65 + oIdx)}</span>
                    <div className="flex-1">
                      <AdvancedEditor 
                        value={opt.text || ''}
                        onChange={(content) => {
                          const newOpts = [...editingQuestion.options];
                          newOpts[oIdx].text = content;
                          setEditingQuestion({...editingQuestion, options: newOpts});
                        }}
                      />
                    </div>
                    <div className="mt-2 flex flex-col items-center gap-2">
                      <button 
                        className="text-red-500 hover:text-red-700 p-1"
                        onClick={() => {
                          const newOpts = editingQuestion.options.filter((_, i) => i !== oIdx);
                          setEditingQuestion({...editingQuestion, options: newOpts});
                        }}
                        title="Remove Option"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <input 
                        type="radio"
                        name={`correct-modal`}
                        checked={opt.isCorrect}
                        className="w-4 h-4 text-primary-600"
                        onChange={() => {
                          const newOpts = editingQuestion.options.map((o, i) => ({...o, isCorrect: i === oIdx}));
                          setEditingQuestion({...editingQuestion, options: newOpts});
                        }}
                      />
                      <span className="text-[10px] text-gray-500">Correct</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t mt-4 space-y-1">
                <label className="text-xs font-semibold text-gray-500 block">Explanation / Solution (Optional)</label>
                <AdvancedEditor 
                  value={editingQuestion.explanation || ''}
                  onChange={(content) => setEditingQuestion({...editingQuestion, explanation: content})}
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSaveEdit} disabled={savingQuestion}>
              {savingQuestion ? "Saving..." : "Save Changes"}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
