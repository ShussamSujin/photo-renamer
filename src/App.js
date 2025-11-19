import React, { useState, useEffect, useRef } from 'react';
// lucide-react 아이콘 불러오기
import { Upload, FileText, Download, RefreshCw, X, AlertCircle, Check, Search, Edit2 } from 'lucide-react';
// jszip 라이브러리 불러오기
import JSZip from 'jszip';

const App = () => {
  const [step, setStep] = useState(1);
  const [studentData, setStudentData] = useState([]);
  const [rawText, setRawText] = useState('');
  const [images, setImages] = useState([]);
  const [matches, setMatches] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  // 1단계: 텍스트 파싱
  const parseStudentData = () => {
    const lines = rawText.split('\n').filter(line => line.trim() !== '');
    const parsed = lines.map(line => {
      const numberMatch = line.match(/\d+/);
      const number = numberMatch ? parseInt(numberMatch[0], 10) : null;
      let name = line.replace(/[0-9]/g, '').replace(/[.\t\r]/g, '').trim();
      return { number, name, original: line };
    }).filter(item => item.number !== null && item.name !== '');

    parsed.sort((a, b) => a.number - b.number);

    if (parsed.length === 0) {
      alert('데이터를 인식할 수 없습니다. "번호 이름" 형식으로 입력해주세요.');
      return;
    }
    setStudentData(parsed);
    setStep(2);
  };

  // 2단계: 이미지 업로드
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      originalName: file.name,
      id: Math.random().toString(36).substr(2, 9)
    }));
    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (id) => {
    setImages(prev => prev.filter(img => img.id !== id));
    const newMatches = { ...matches };
    Object.keys(newMatches).forEach(key => {
      if (newMatches[key] === id) delete newMatches[key];
    });
    setMatches(newMatches);
  };

  // 매칭 로직
  const executeMatching = (currentStudentData) => {
    const newMatches = {};
    const usedImageIds = new Set();

    currentStudentData.forEach(student => {
      const cleanStudentName = student.name.replace(/\s+/g, '');
      if (!cleanStudentName) return;

      const matchedImage = images.find(img => {
        if (usedImageIds.has(img.id)) return false;
        const cleanFileName = img.originalName.replace(/\s+/g, '').toLowerCase();
        const studentNameLower = cleanStudentName.toLowerCase();
        return cleanFileName.includes(studentNameLower);
      });

      if (matchedImage) {
        newMatches[student.number] = matchedImage.id;
        usedImageIds.add(matchedImage.id);
      }
    });
    return newMatches;
  };

  const startMatching = () => {
    const newMatches = executeMatching(studentData);
    setMatches(newMatches);
    setStep(3);
  };

  const rematch = () => {
    const newMatches = executeMatching(studentData);
    setMatches(newMatches);
    alert("현재 이름을 기준으로 매칭을 새로고침했습니다.");
  };

  const handleStudentInfoChange = (index, field, value) => {
    const newData = [...studentData];
    if (field === 'number') {
        const num = parseInt(value, 10);
        if (!isNaN(num)) newData[index][field] = num;
        else newData[index][field] = value;
    } else {
        newData[index][field] = value;
    }
    setStudentData(newData);
  };

  // 3단계: 다운로드 (수정된 부분: JSZip을 직접 사용)
  const handleDownload = async () => {
    const matchedCount = Object.keys(matches).length;
    if (matchedCount === 0) {
      alert('매칭된 이미지가 없습니다.');
      return;
    }

    setIsProcessing(true);
    const zip = new JSZip(); // window.JSZip이 아니라 JSZip 사용
    const folder = zip.folder("나이스_학생사진_이름변경_완료");

    studentData.forEach(student => {
      const imageId = matches[student.number];
      if (imageId) {
        const image = images.find(img => img.id === imageId);
        if (image) {
          const extension = image.originalName.split('.').pop();
          const newFilename = `${student.name}(${student.number}).${extension}`;
          folder.file(newFilename, image.file);
        }
      }
    });

    try {
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = "나이스_학생사진_이름변경.zip";
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Zip creation failed:", error);
      alert("압축 파일 생성 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetAll = () => {
    setStep(1);
    setStudentData([]);
    setRawText('');
    setImages([]);
    setMatches({});
  };

  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Jua&display=swap');
          /* 폰트 설정 */
          body { font-family: 'Jua', sans-serif; }
        `}
      </style>
      <div className="min-h-screen p-4 md:p-8"
          style={{
            background: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
            color: '#334155'
          }}>
        <div className="max-w-4xl mx-auto bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-white/50">
          
          {/* Header */}
          <header className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white flex justify-between items-center shadow-md">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2 drop-shadow-sm">
                <RefreshCw className="w-8 h-8" />
                나이스 학생 사진 이름 변환기
              </h1>
              <p className="text-purple-100 text-base mt-1 font-medium opacity-90">
                이름만 있으면 번호는 자동으로! 쉽고 예쁘게 바꿔드려요.
              </p>
            </div>
            {step > 1 && (
              <button 
                onClick={resetAll}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full text-sm flex items-center gap-1 transition backdrop-blur-md border border-white/30"
              >
                <RefreshCw className="w-4 h-4" /> 처음으로
              </button>
            )}
          </header>

          {/* Progress Bar */}
          <div className="flex border-b border-slate-100 bg-white">
            <div className={`flex-1 py-4 text-center text-lg transition-colors duration-300 ${step >= 1 ? 'text-pink-500 font-bold border-b-4 border-pink-400 bg-pink-50/50' : 'text-slate-400'}`}>
              1. 명렬표 입력
            </div>
            <div className={`flex-1 py-4 text-center text-lg transition-colors duration-300 ${step >= 2 ? 'text-purple-500 font-bold border-b-4 border-purple-400 bg-purple-50/50' : 'text-slate-400'}`}>
              2. 사진 업로드
            </div>
            <div className={`flex-1 py-4 text-center text-lg transition-colors duration-300 ${step >= 3 ? 'text-blue-500 font-bold border-b-4 border-blue-400 bg-blue-50/50' : 'text-slate-400'}`}>
              3. 매칭 수정 및 다운로드
            </div>
          </div>

          {/* Content Area */}
          <div className="p-6 md:p-10">
            
            {/* Step 1: Data Input */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 text-blue-800 flex items-start gap-4 shadow-sm">
                  <div className="bg-blue-200 p-2 rounded-full text-blue-600">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-lg mb-2 text-blue-700">사용 방법</p>
                    <p className="text-base leading-relaxed">구글 스프레드시트나 엑셀에서 <strong>[번호]</strong>와 <strong>[이름]</strong> 열을 복사해서 아래 상자에 붙여넣으세요.</p>
                    <p className="mt-2 text-sm text-blue-600 bg-blue-100/50 inline-block px-2 py-1 rounded">
                      💡 사진 파일명에 번호가 없어도, 이름만 있으면 자동으로 척척 매칭해드려요!
                    </p>
                  </div>
                </div>
                
                <textarea
                  className="w-full h-72 p-6 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-purple-100 focus:border-purple-400 outline-none resize-none text-base shadow-inner transition-all bg-slate-50 focus:bg-white"
                  placeholder={`여기에 명렬표를 붙여넣으세요...\n\n1 홍길동\n2 김철수\n...`}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                />

                <div className="flex justify-end">
                  <button
                    onClick={parseStudentData}
                    disabled={!rawText.trim()}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-purple-200 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    다음 단계로 가기 <Search className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Image Upload */}
            {step === 2 && (
              <div className="space-y-6">
                {images.length === 0 ? (
                  <div 
                    className="border-4 border-dashed border-purple-200 rounded-3xl p-16 text-center hover:bg-purple-50 hover:border-purple-300 transition-all cursor-pointer flex flex-col items-center justify-center gap-6 group bg-slate-50"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="bg-white p-6 rounded-full text-purple-500 shadow-md group-hover:scale-110 transition-transform">
                      <Upload className="w-12 h-12" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-700 mb-2">사진 파일들을 선택해주세요</p>
                      <p className="text-slate-500 text-lg">파일명에 학생 이름이 포함되어 있으면 더 좋아요 ✨</p>
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      className="hidden"
                      multiple 
                      accept="image/*"
                      onChange={handleFileUpload}
                    />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center bg-purple-50 p-4 rounded-xl border border-purple-100">
                      <h3 className="font-bold text-xl text-purple-800 ml-2">총 {images.length}장의 사진이 준비되었어요</h3>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2 bg-white border-2 border-purple-200 text-purple-700 rounded-lg hover:bg-purple-50 font-bold transition"
                        >
                          사진 더 추가하기
                        </button>
                        <button 
                          onClick={startMatching}
                          className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 font-bold shadow-md transition flex items-center gap-2"
                        >
                          매칭 결과 확인 <Search className="w-5 h-5" />
                        </button>
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden"
                        multiple 
                        accept="image/*"
                        onChange={handleFileUpload}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[500px] overflow-y-auto p-4 border-2 border-slate-100 rounded-2xl bg-slate-50">
                      {images.map((img) => (
                        <div key={img.id} className="relative group aspect-square bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition">
                          <img src={img.preview} alt={img.originalName} className="w-full h-full object-cover" />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm text-white text-xs p-2 truncate text-center font-medium">
                            {img.originalName}
                          </div>
                          <button 
                            onClick={() => removeImage(img.id)} 
                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition hover:scale-110 shadow-sm"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Matching Result */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center justify-between bg-green-50 p-6 rounded-2xl border border-green-200 text-green-800 text-base shadow-sm gap-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-green-200 p-2 rounded-full text-green-700 shrink-0">
                      <Check className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-lg text-green-800 mb-1">매칭 및 수정</p>
                      <p>왼쪽의 <strong>이름과 번호</strong>를 클릭하여 수정할 수 있습니다.<br/>오타를 수정하고 [다시 매칭] 버튼을 누르면 사진을 다시 찾아요.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <button 
                      onClick={rematch}
                      className="px-4 py-2 bg-white border-2 border-green-400 rounded-xl hover:bg-green-100 text-green-700 font-bold text-sm flex items-center gap-2 transition shadow-sm"
                    >
                      <RefreshCw className="w-4 h-4" /> 현재 이름으로 다시 매칭
                    </button>
                    <div className="text-right bg-white px-4 py-2 rounded-xl border border-green-200 shadow-sm">
                      <span className="font-bold text-xl text-green-600">{Object.keys(matches).length}</span> 
                      <span className="text-slate-400 mx-1">/</span> 
                      <span className="text-slate-600 font-medium">{studentData.length} 명</span>
                    </div>
                  </div>
                </div>

                <div className="border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col max-h-[600px] bg-white">
                  <div className="bg-slate-50 p-4 grid grid-cols-12 gap-4 font-bold text-base text-slate-600 border-b-2 border-slate-100 shrink-0">
                    <div className="col-span-4 pl-4">학생 정보 (수정가능)</div>
                    <div className="col-span-8">매칭 결과 (원본 → 변환)</div>
                  </div>
                  
                  <div className="overflow-y-auto bg-white divide-y divide-slate-50">
                    {studentData.map((student, idx) => {
                      const matchedImageId = matches[student.number];
                      const image = images.find(img => img.id === matchedImageId);
                      const isMatched = !!image;
                      
                      return (
                        <div key={idx} className={`grid grid-cols-12 gap-4 p-4 items-center transition-colors ${!isMatched ? 'bg-red-50/50' : 'hover:bg-blue-50/30'}`}>
                          {/* Left: Student Info (Editable) */}
                          <div className="col-span-4 flex items-center gap-3 pl-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base shrink-0 shadow-sm transition-colors ${isMatched ? 'bg-indigo-100 text-indigo-600 font-bold' : 'bg-red-100 text-red-600 font-bold border border-red-200'}`}>
                              <input 
                                type="text" 
                                value={student.number}
                                onChange={(e) => handleStudentInfoChange(idx, 'number', e.target.value)}
                                className="w-full h-full text-center bg-transparent outline-none font-bold rounded-full focus:bg-white/50"
                              />
                            </div>
                            <div className="flex-1 min-w-0 relative group/edit">
                              <input 
                                  type="text"
                                  value={student.name}
                                  onChange={(e) => handleStudentInfoChange(idx, 'name', e.target.value)}
                                  className="w-full bg-transparent border-b-2 border-transparent focus:border-indigo-400 outline-none font-bold text-lg text-slate-800 py-1 transition-colors"
                              />
                              <Edit2 className="w-4 h-4 text-indigo-300 absolute right-0 top-2 opacity-0 group-hover/edit:opacity-100 pointer-events-none transition-opacity" />
                            </div>
                          </div>

                          {/* Right: Image Match */}
                          <div className="col-span-8 flex items-center gap-4">
                            {isMatched ? (
                              <>
                                <div className="w-14 h-14 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-200 shadow-sm group hover:scale-105 transition-transform">
                                  <img src={image.preview} alt="" className="w-full h-full object-cover" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                                    <span className="line-through opacity-60">{image.originalName}</span>
                                  </div>
                                  <div className="text-base font-bold text-indigo-600 truncate flex items-center gap-2 bg-indigo-50 px-3 py-1 rounded-lg inline-block border border-indigo-100">
                                    <span className="text-indigo-400">→</span> 
                                    {student.name}({student.number}).{image.originalName.split('.').pop()}
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="text-red-500 text-sm font-medium flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-red-100 shadow-sm">
                                <AlertCircle className="w-4 h-4" /> 
                                <span>매칭된 사진이 없어요</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-6 border-t border-slate-200">
                   <div className="text-sm text-slate-500 flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                     이름을 수정하면 결과 파일명도 즉시 변경됩니다.
                   </div>
                   <button
                    onClick={handleDownload}
                    disabled={isProcessing || Object.keys(matches).length === 0}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-8 py-4 rounded-xl font-bold text-xl shadow-lg shadow-green-200 transition-all hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-6 h-6 animate-spin" /> 처리 중...
                      </>
                    ) : (
                      <>
                        <Download className="w-6 h-6" /> 변환된 파일 다운로드 (.zip)
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        <footer className="mt-8 mb-8 text-center text-slate-700 text-sm font-medium opacity-80 space-y-1">
          <p>문의: gajungssamzzang@gmail.com</p>
          <p>©Google Certified Innovator & Trainer Sujin Lee, All right reserved</p>
        </footer>
      </div>
    </>
  );
};

export default App;