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
  
  const [subjects, setSubjects] = useState([]);
  const [hierarchy, setHierarchy] = useState([]);
  const [topicQuestions, setTopicQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  
  const [activeTab, setActiveTab] = useState('SUBJECT_FOLDERS'); // 'SUBJECT_FOLDERS' | 'FULL_PAPERS'
  const [fullPapers, setFullPapers] = useState([]);
  const [loadingFullPapers, setLoadingFullPapers] = useState(false);

  const [fullPaperPath, setFullPaperPath] = useState([]); // Level 0: [], Level 1: [paperId], Level 2: [paperId, subjectName]
  const [fullPaperData, setFullPaperData] = useState(null);
  
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  const [promptModal, setPromptModal] = useState({
    isOpen: false,
    title: '',
    value: '',
    onSubmit: null
  });
  
  // path can be: 
  // [] (Root / Subjects)
  // [{ type: 'SUBJECT', id: 'sId', name: 'Physics', ref: subjectNode }]
  // [{ type: 'SUBJECT', ... }, { type: 'CHAPTER', id: 'cId', name: 'Kinematics', ref: chapterNode }]
  // [{ type: 'SUBJECT', ... }, { type: 'CHAPTER', ... }, { type: 'TOPIC', id: 'tId', name: 'Velocity', ref: topicNode }]
  const [path, setPath] = useState([]);

  useEffect(() => {
    fetchData();
    fetchFullPapers();
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
      const [catRes, hierRes] = await Promise.all([
        adminAPI.getQuestionCategories(),
        adminAPI.getQuestionBankHierarchy()
      ]);
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

  
    const handleTogglePublish = async (e, type, id, currentlyUnpublished) => {
    e.stopPropagation();
    const targetVal = !currentlyUnpublished;
    try {
      // Optimistic update helper (mutating safely for local visual feedback)
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

  const handleFullPaperClick = async (paper) => {
    try {
      const res = await adminAPI.getQuestionBankById(paper._id);
      const data = res.data?.data;
      if (data) {
        setFullPaperData(data);
        setFullPaperPath([paper]); // Level 1
      }
    } catch (err) {
      toast.error('Failed to load full paper details');
    }
  };

  const handleCreateSubject = async () => {
    setPromptModal({
      isOpen: true,
      title: "Enter new Subject name:",
      value: "",
      onSubmit: async (name) => {
        if (!name) return;
        try {
          await adminAPI.createQuestionCategory({ name });
          toast.success("Subject created!");
          fetchData();
        } catch (err) {
          toast.error(err.response?.data?.message || "Failed to create subject");
        }
      }
    });
  };

  const handleCreateFullPaper = async () => {
    setPromptModal({
      isOpen: true,
      title: "Enter new Full Paper name (e.g. JEE Mock Test 1):",
      value: "",
      onSubmit: async (name) => {
        if (!name) return;
        try {
          await adminAPI.createQuestionBank({ title: name, bankType: 'FULL_PAPER', description: '', questions: [] });
          toast.success("Full Paper Folder created!");
          fetchFullPapers();
        } catch (err) {
          toast.error(err.response?.data?.message || "Failed to create full paper");
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

  const handleRenameFullPaper = async (e, id, oldTitle) => {
    e.stopPropagation();
    setPromptModal({
      isOpen: true,
      title: "Enter new Full Paper name:",
      value: oldTitle,
      onSubmit: async (newTitle) => {
        if (!newTitle || newTitle === oldTitle) return;
        try {
          await adminAPI.renameQuestionBank(id, { title: newTitle });
          toast.success("Full Paper renamed!");
          fetchFullPapers();
        } catch (err) {
          toast.error(err.response?.data?.message || "Failed to rename full paper");
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

  const handleRenameFullPaperSubject = async (e, oldSubjectName) => {
    e.stopPropagation();
    if (!fullPaperData) return;
    setPromptModal({
      isOpen: true,
      title: "Enter new Subject name:",
      value: oldSubjectName,
      onSubmit: async (newSubjectName) => {
        if (!newSubjectName || newSubjectName === oldSubjectName) return;
        try {
          const newQuestions = fullPaperData.questions.map(q => {
            if ((q.subjectName || 'General') === oldSubjectName) {
              return { ...q, subjectName: newSubjectName };
            }
            return q;
          });
          await adminAPI.updateQuestionBank(fullPaperData._id, { questions: newQuestions });
          toast.success("Subject renamed!");
          setFullPaperData({ ...fullPaperData, questions: newQuestions });
        } catch (err) {
          toast.error("Failed to rename subject");
        }
      }
    });
  };

  const handleRenameFullPaperChapter = async (e, subjectName, oldChapterName) => {
    e.stopPropagation();
    if (!fullPaperData) return;
    setPromptModal({
      isOpen: true,
      title: "Enter new Chapter name:",
      value: oldChapterName,
      onSubmit: async (newChapterName) => {
        if (!newChapterName || newChapterName === oldChapterName) return;
        try {
          const newQuestions = fullPaperData.questions.map(q => {
            if ((q.subjectName || 'General') === subjectName && (q.chapterName || 'General') === oldChapterName) {
              return { ...q, chapterName: newChapterName };
            }
            return q;
          });
          await adminAPI.updateQuestionBank(fullPaperData._id, { questions: newQuestions });
          toast.success("Chapter renamed!");
          setFullPaperData({ ...fullPaperData, questions: newQuestions });
        } catch (err) {
          toast.error("Failed to rename chapter");
        }
      }
    });
  };

  const handleRenameFullPaperTopic = async (e, subjectName, chapterName, oldTopicName) => {
    e.stopPropagation();
    if (!fullPaperData) return;
    setPromptModal({
      isOpen: true,
      title: "Enter new Topic name:",
      value: oldTopicName,
      onSubmit: async (newTopicName) => {
        if (!newTopicName || newTopicName === oldTopicName) return;
        try {
          const newQuestions = fullPaperData.questions.map(q => {
            if ((q.subjectName || 'General') === subjectName && 
                (q.chapterName || 'General') === chapterName && 
                (q.topicName || 'General') === oldTopicName) {
              return { ...q, topicName: newTopicName };
            }
            return q;
          });
          await adminAPI.updateQuestionBank(fullPaperData._id, { questions: newQuestions });
          toast.success("Topic renamed!");
          setFullPaperData({ ...fullPaperData, questions: newQuestions });
        } catch (err) {
          toast.error("Failed to rename topic");
        }
      }
    });
  };

  const navigateTo = (levelData) => {
    setPath([...path, levelData]);
  };

  useEffect(() => {
    if (path.length === 3) { // Inside a topic
      fetchTopicQuestions();
    }
  }, [path]);

  const fetchTopicQuestions = async () => {
    if (path.length !== 3) return;
    try {
      setLoadingQuestions(true);
      const res = await adminAPI.getQuestionsByHierarchy({
        subject: path[0].id,
        chapter: path[1].id,
        topic: path[2].id
      });
      setTopicQuestions(res.data?.data || []);
    } catch (err) {
      toast.error('Failed to load questions');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const goBack = () => {
    setPath(path.slice(0, -1));
  };

  const navigateToCrumb = (index) => {
    setPath(path.slice(0, index + 1));
  };

  // View Renderers
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

    return (
      <div className="space-y-6">
        {fullPaperPath.length === 0 && (
          <div className="flex bg-gray-100 p-1 rounded-lg w-fit mb-6">
            <button
              className={`px-6 py-2 rounded-md font-medium text-sm transition-all ${
                activeTab === 'SUBJECT_FOLDERS'
                  ? 'bg-white shadow text-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('SUBJECT_FOLDERS')}
            >
              Subject Folders
            </button>
            <button
              className={`px-6 py-2 rounded-md font-medium text-sm transition-all ${
                activeTab === 'FULL_PAPERS'
                  ? 'bg-white shadow text-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('FULL_PAPERS')}
            >
              Full Papers
            </button>
          </div>
        )}

        {activeTab === 'SUBJECT_FOLDERS' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displaySubjects.map(sub => (
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
              onClick={handleCreateSubject}
              className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-primary-600 hover:border-primary-300 cursor-pointer transition-colors min-h-[120px]"
            >
              <Plus className="w-8 h-8 mb-2" />
              <span className="font-medium">Create Subject Folder</span>
            </div>
          </div>
        ) : (
          renderFullPapersTab()
        )}
      </div>
    );
  };

  
  const togglePublishSubject = async (subjectName, currentlyUnpublished) => {
    if (!fullPaperData) return;
    try {
      const newQuestions = fullPaperData.questions.map(q => {
        if ((q.subjectName || 'General') === subjectName) {
          return { ...q, isUnpublished: !currentlyUnpublished };
        }
        return q;
      });
      await adminAPI.updateQuestionBank(fullPaperData._id, { questions: newQuestions });
      toast.success(currentlyUnpublished ? "Subject Published!" : "Subject Unpublished!");
      setFullPaperData({ ...fullPaperData, questions: newQuestions });
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const deleteSubjectFromPaper = async (subjectName) => {
    if (!fullPaperData) return;
    setItemToDelete({
      name: `Subject ${subjectName}`,
      onConfirm: async () => {
        try {
          const newQuestions = fullPaperData.questions.filter(q => (q.subjectName || 'General') !== subjectName);
          await adminAPI.updateQuestionBank(fullPaperData._id, { questions: newQuestions });
          toast.success("Subject moved to Recycle Bin!");
          setFullPaperData({ ...fullPaperData, questions: newQuestions });
        } catch (err) {
          toast.error("Failed to delete subject");
        }
      }
    });
  };

  const togglePublishChapter = async (subjectName, chapterName, currentlyUnpublished) => {
    if (!fullPaperData) return;
    try {
      const newQuestions = fullPaperData.questions.map(q => {
        if ((q.subjectName || 'General') === subjectName && (q.chapterName || 'General') === chapterName) {
          return { ...q, isUnpublished: !currentlyUnpublished };
        }
        return q;
      });
      await adminAPI.updateQuestionBank(fullPaperData._id, { questions: newQuestions });
      toast.success(currentlyUnpublished ? "Chapter Published!" : "Chapter Unpublished!");
      setFullPaperData({ ...fullPaperData, questions: newQuestions });
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const deleteChapterFromPaper = async (subjectName, chapterName) => {
    if (!fullPaperData) return;
    setItemToDelete({
      name: `Chapter ${chapterName}`,
      onConfirm: async () => {
        try {
          const newQuestions = fullPaperData.questions.filter(q => !((q.subjectName || 'General') === subjectName && (q.chapterName || 'General') === chapterName));
          await adminAPI.updateQuestionBank(fullPaperData._id, { questions: newQuestions });
          toast.success("Chapter moved to Recycle Bin!");
          setFullPaperData({ ...fullPaperData, questions: newQuestions });
        } catch (err) {
          toast.error("Failed to delete chapter");
        }
      }
    });
  };

  const togglePublishTopic = async (subjectName, chapterName, topicName, currentlyUnpublished) => {
    if (!fullPaperData) return;
    try {
      const newQuestions = fullPaperData.questions.map(q => {
        if ((q.subjectName || 'General') === subjectName && (q.chapterName || 'General') === chapterName && (q.topicName || 'General') === topicName) {
          return { ...q, isUnpublished: !currentlyUnpublished };
        }
        return q;
      });
      await adminAPI.updateQuestionBank(fullPaperData._id, { questions: newQuestions });
      toast.success(currentlyUnpublished ? "Topic Published!" : "Topic Unpublished!");
      setFullPaperData({ ...fullPaperData, questions: newQuestions });
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const deleteTopicFromPaper = async (subjectName, chapterName, topicName) => {
    if (!fullPaperData) return;
    setItemToDelete({
      name: `Topic ${topicName}`,
      onConfirm: async () => {
        try {
          const newQuestions = fullPaperData.questions.filter(q => !((q.subjectName || 'General') === subjectName && (q.chapterName || 'General') === chapterName && (q.topicName || 'General') === topicName));
          await adminAPI.updateQuestionBank(fullPaperData._id, { questions: newQuestions });
          toast.success("Topic moved to Recycle Bin!");
          setFullPaperData({ ...fullPaperData, questions: newQuestions });
        } catch (err) {
          toast.error("Failed to delete topic");
        }
      }
    });
  };

  const renderFullPapersTab = () => {
    if (fullPaperPath.length === 0) {
      return (
        <div className="space-y-4">
          {loadingFullPapers ? (
            <p className="text-gray-500">Loading full papers...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fullPapers.map(paper => (
                <Card 
                  key={paper._id} 
                  className="p-4 border-l-4 border-l-blue-500 relative group cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleFullPaperClick(paper)}
                >
                  <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ActionMenu actions={[
                      { label: 'Edit', icon: Edit, onClick: (e) => handleRenameFullPaper(e, paper._id, paper.title) },
                      { 
                        label: 'Move to Recycle Bin', 
                        icon: Trash2, 
                        danger: true, 
                        onClick: (e) => {
                          e.stopPropagation();
                          setItemToDelete({
                            name: `Full Paper "${paper.title}"`,
                            onConfirm: async () => {
                              try {
                                await adminAPI.deleteQuestionBank(paper._id);
                                toast.success("Full Paper moved to Recycle Bin!");
                                fetchFullPapers();
                              } catch (err) {
                                toast.error("Failed to move paper");
                              }
                            }
                          });
                        }
                      }
                    ]} />
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Folder className="w-6 h-6 text-blue-500" />
                    <h3 className="font-bold text-lg text-gray-800 pr-6 truncate">{paper.title}</h3>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">{paper.totalQuestions} Questions</p>
                  <p className="text-sm text-gray-500 mt-1">{paper.totalMarks} Total Marks</p>
                  <p className="text-xs text-gray-400 mt-3">Uploaded on: {new Date(paper.createdAt).toLocaleDateString()}</p>
                </Card>
              ))}
              <div 
                onClick={handleCreateFullPaper}
                className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300 cursor-pointer transition-colors min-h-[120px]"
              >
                <Plus className="w-8 h-8 mb-2" />
                <span className="font-medium">Create Full Paper Folder</span>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (fullPaperPath.length === 1 && fullPaperData) {
      // Level 1: List subjects in the full paper
      const questions = fullPaperData.questions || [];
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
                className={`p-4 cursor-pointer hover:shadow-md transition-all border-l-4 relative group ${sub.unpublished ? 'border-l-gray-300 opacity-60' : 'border-l-blue-400'}`}
                onClick={() => setFullPaperPath([fullPaperPath[0], sub.name])}
              >
                  <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ActionMenu actions={[
                      { label: 'Edit', icon: Edit, onClick: (e) => handleRenameFullPaperSubject(e, sub.name) },
                      { label: sub.unpublished ? 'Publish' : 'Unpublish', icon: sub.unpublished ? Eye : EyeOff, onClick: (e) => { e.stopPropagation(); togglePublishSubject(sub.name, sub.unpublished); } },
                      { label: 'Move to Recycle Bin', icon: Trash2, danger: true, onClick: (e) => { e.stopPropagation(); deleteSubjectFromPaper(sub.name); } }
                    ]} />
                  </div>
                <Folder className={`w-8 h-8 mb-2 ${sub.unpublished ? 'text-gray-400' : 'text-blue-400'}`} />
                <h3 className="font-bold text-lg text-gray-800 line-clamp-1">{sub.name} {sub.unpublished && <span className="text-xs text-red-500 font-normal ml-2">(Unpublished)</span>}</h3>
                <p className="text-sm text-gray-500 mt-1">{sub.count} Questions</p>
                <p className="text-sm text-gray-500">{sub.marks} Marks</p>
              </Card>
            ))}
          </div>
        </div>
      );
    }

    if (fullPaperPath.length === 2 && fullPaperData) {
      // Level 2: List chapters in the subject
      const subjectName = fullPaperPath[1];
      const questions = (fullPaperData.questions || []).filter(q => (q.subjectName || 'General') === subjectName);
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
                className={`p-4 cursor-pointer hover:shadow-md transition-all border-l-4 relative group ${ch.unpublished ? 'border-l-gray-300 opacity-60' : 'border-l-blue-400'}`}
                onClick={() => setFullPaperPath([...fullPaperPath, ch.name])}
              >
                <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ActionMenu actions={[
                    { label: 'Edit', icon: Edit, onClick: (e) => handleRenameFullPaperChapter(e, subjectName, ch.name) },
                    { label: ch.unpublished ? 'Publish' : 'Unpublish', icon: ch.unpublished ? Eye : EyeOff, onClick: (e) => { e.stopPropagation(); togglePublishChapter(subjectName, ch.name, ch.unpublished); } },
                    { label: 'Move to Recycle Bin', icon: Trash2, danger: true, onClick: (e) => { e.stopPropagation(); deleteChapterFromPaper(subjectName, ch.name); } }
                  ]} />
                </div>
                <Folder className={`w-8 h-8 mb-2 ${ch.unpublished ? 'text-gray-400' : 'text-blue-400'}`} />
                <h3 className="font-bold text-lg text-gray-800 line-clamp-1">{ch.name} {ch.unpublished && <span className="text-xs text-red-500 font-normal ml-2">(Unpublished)</span>}</h3>
                <p className="text-sm text-gray-500 mt-1">{ch.count} Questions</p>
                <p className="text-sm text-gray-500">{ch.marks} Marks</p>
              </Card>
            ))}
          </div>
        </div>
      );
    }

    if (fullPaperPath.length === 3 && fullPaperData) {
      // Level 3: List topics in the chapter
      const subjectName = fullPaperPath[1];
      const chapterName = fullPaperPath[2];
      const questions = (fullPaperData.questions || []).filter(q => (q.subjectName || 'General') === subjectName && (q.chapterName || 'General') === chapterName);
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
                onClick={() => setFullPaperPath([...fullPaperPath, t.name])}
              >
                <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ActionMenu actions={[
                    { label: 'Edit', icon: Edit, onClick: (e) => handleRenameFullPaperTopic(e, subjectName, chapterName, t.name) },
                    { label: t.unpublished ? 'Publish' : 'Unpublish', icon: t.unpublished ? Eye : EyeOff, onClick: (e) => { e.stopPropagation(); togglePublishTopic(subjectName, chapterName, t.name, t.unpublished); } },
                    { label: 'Move to Recycle Bin', icon: Trash2, danger: true, onClick: (e) => { e.stopPropagation(); deleteTopicFromPaper(subjectName, chapterName, t.name); } }
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

    if (fullPaperPath.length === 4 && fullPaperData) {
      // Level 4: List questions
      const subjectName = fullPaperPath[1];
      const chapterName = fullPaperPath[2];
      const topicName = fullPaperPath[3];
      const questions = (fullPaperData.questions || []).filter(q => 
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
                  <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={() => handleEditClick(q, fullPaperData._id)}>
                    <Edit2 className="w-3 h-3" /> Edit Question
                  </Button>
                  <Button variant="outline" size="sm" className="flex items-center gap-1 text-red-600 hover:bg-red-50" onClick={() => handleDeleteQuestion(q._id, fullPaperData._id)}>
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
            
            <div className="space-y-2 pl-6">
              {q.options?.map((opt, oIdx) => (
                <div key={oIdx} className={`p-2 rounded border ${opt.isCorrect ? 'border-success-500 bg-success-50 text-success-800 font-medium' : 'border-gray-200 text-gray-600'}`}>
                  <div dangerouslySetInnerHTML={{ __html: opt.text }} />
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

  const currentLevel = path.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Question Banks"
        description="Organize questions by Subject, Chapter, and Topic."
        actions={
          <div className="flex gap-2">
            <a href="/sample-template.docx" download>
              <Button variant="secondary" icon={FileText}>Sample Format</Button>
            </a>
            {activeTab === 'SUBJECT_FOLDERS' && currentLevel > 0 && (
              <Button 
                icon={Upload} 
                onClick={() => router.push(`/admin/question-banks/create?subjectId=${path[0].id}`)}
              >
                Edit / Upload Questions
              </Button>
            )}

            {activeTab === 'FULL_PAPERS' && fullPaperPath.length > 0 && (
              <Button 
                icon={Upload} 
                onClick={() => router.push(`/admin/question-banks/${fullPaperPath[0]._id}/edit?tab=FULL_PAPERS`)}
              >
                Edit / Upload Questions
              </Button>
            )}
          </div>
        }
      />

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        {/* Breadcrumbs */}
        <div className="flex items-center text-sm mb-6 pb-4 border-b">
          {activeTab === 'SUBJECT_FOLDERS' ? (
            <>
              <button 
                onClick={() => setPath([])}
                className={`flex items-center ${currentLevel === 0 ? 'font-bold text-primary-700' : 'text-gray-500 hover:text-primary-600'}`}
              >
                Subjects
              </button>
              
              {path.map((crumb, idx) => (
                <div key={crumb.id} className="flex items-center">
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
          ) : (
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
                    {idx === 0 ? crumb.title : crumb}
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Content Renderers */}
        {loading ? (
          <div className="py-12 text-center text-gray-500">Loading folders...</div>
        ) : (
          <div className="min-h-[400px]">
            {currentLevel === 0 && renderRoot()}
            {currentLevel === 1 && renderChapters(path[0].ref)}
            {currentLevel === 2 && renderTopics(path[1].ref)}
            {currentLevel === 3 && renderQuestions(path[2].id)}
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
          <ModalHeader title={promptModal.title} onClose={() => setPromptModal({ ...promptModal, isOpen: false })} />
          <ModalBody>
            <div className="py-4">
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
            </div>
          </ModalBody>
          <ModalFooter>
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
          <ModalHeader title="Edit Question" onClose={() => setIsEditModalOpen(false)} />
          <ModalBody className="max-h-[70vh] overflow-y-auto">
            <div className="space-y-4 pb-12">
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2 p-3 bg-gray-50 border border-gray-200 rounded-lg shadow-inner">
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 block mb-1 uppercase tracking-wider">Subject</label>
                  <input type="text" className="w-full border border-gray-300 rounded p-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 bg-white" value={editingQuestion.subjectName || (typeof editingQuestion.subject === 'string' ? editingQuestion.subject : editingQuestion.subject?.name) || ''} onChange={(e) => setEditingQuestion({...editingQuestion, subjectName: e.target.value})} placeholder="e.g. Physics" />
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
          <ModalFooter>
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
