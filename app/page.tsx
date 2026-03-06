// Since the user provided raw SVG icons in the HTML, I will try to replace them with Lucide icons where possible for cleaner code,
// or keep the SVGs if they are specific. The user's prompt implies converting the HTML.
// I will stick to the SVGs provided in the HTML to ensure exact fidelity to the design requested, 
// but I'll wrap them in a clean component structure.

export default function Page() {
  return (
    <div className="max-w-4xl w-full bg-white shadow-2xl rounded-[2.5rem] overflow-hidden border border-slate-200 relative">
      
      {/* Background Decorations */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-100 rounded-full -mr-40 -mt-40 opacity-60 blur-bg pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-100 rounded-full -ml-48 -mb-48 opacity-60 blur-bg pointer-events-none"></div>

      {/* Header Section */}
      <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white p-12 sm:p-20 text-center relative overflow-hidden">
        {/* Decorative Grid */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        <div className="relative z-10">
          <div className="inline-block px-6 py-1.5 border border-indigo-400 rounded-full text-indigo-200 text-xs font-bold tracking-[0.2em] mb-8 uppercase bg-white/5 backdrop-blur-sm">
            Premium Research Bootcamp
          </div>
          <h1 className="text-4xl sm:text-6xl font-black mb-8 leading-[1.15] tracking-tight">
            AI 활용 학위논문 <br/>
            <span className="gradient-text">1일 완성 부트캠프</span>
          </h1>
          <p className="text-lg sm:text-xl text-indigo-100 max-w-2xl mx-auto font-light leading-relaxed">
            &quot;지식의 부재가 아닌, 문장의 장벽에 갇힌 연구자를 위하여.&quot; <br/>
            <span className="font-normal">단 12시간, AI와 함께 당신의 연구에 마침표를 찍으십시오.</span>
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8 sm:p-16 space-y-16">
        
        {/* Context & Value Proposition */}
        <div className="grid md:grid-cols-2 gap-10 items-start">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-lg shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-800 tracking-tight">대상 및 취지</h3>
            </div>
            <p className="text-slate-600 leading-relaxed text-lg">
              학문적 통찰은 충분하지만, 그것을 글로 옮기는 과정에서 고립된 학위 논문 작성자들을 모십니다. 
              본 과정은 AI를 단순한 도구가 아닌, <strong className="text-indigo-900 underline decoration-indigo-300 decoration-4 underline-offset-4">‘연구의 파트너’</strong>로 활용하여 논리적 구조를 세우고 문장을 정제하는 법을 전수합니다.
            </p>
          </div>
          
          <div className="bg-indigo-50 p-8 rounded-[2rem] border border-indigo-100 shadow-inner">
            <h4 className="font-bold text-indigo-900 mb-6 flex items-center gap-2 text-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              이런 분들을 기다립니다
            </h4>
            <ul className="space-y-4 text-slate-700">
              <li className="flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-indigo-600 mt-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">AI 활용 논문 작성 방법론을 체득하고 싶으신 분</span>
              </li>
              <li className="flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-indigo-600 mt-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">단 하루 만에 논문의 뼈대와 기초를 완성하고 싶은 분</span>
              </li>
              <li className="flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-indigo-600 mt-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">글쓰기의 막막함 때문에 연구가 정체된 연구자</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Practical Information */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div className="p-8 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 group">
            <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-indigo-600 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h4 className="font-bold text-slate-900 mb-2 text-lg">일시</h4>
            <p className="text-slate-600 font-medium">2026. 04. 03 (금)</p>
            <p className="text-indigo-600 font-bold">09:00 - 21:00 (12H)</p>
          </div>

          <div className="p-8 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 group">
            <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-indigo-600 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h4 className="font-bold text-slate-900 mb-2 text-lg">장소</h4>
            <p className="text-slate-600 font-medium text-base">서울권 대형 세미나실</p>
            <p className="text-slate-400 text-sm italic font-light mt-1">* 상세 장소 개별 공지</p>
          </div>

          <div className="p-8 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 group">
            <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-indigo-600 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h4 className="font-bold text-slate-900 mb-2 text-lg">교육비</h4>
            <p className="text-indigo-600 font-black text-xl italic tracking-tight">1,990,000원</p>
            <p className="text-slate-500 text-sm mt-1">최고급 식사 및 다과 포함</p>
          </div>
        </div>

        {/* Call to Action Banner */}
        <div className="bg-slate-900 text-white p-10 sm:p-14 rounded-[2.5rem] relative overflow-hidden shadow-2xl">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="space-y-4">
              <h3 className="text-3xl font-extrabold tracking-tight">논문의 마침표를 찍는 시간</h3>
              <p className="text-slate-400 text-lg leading-relaxed max-w-md">
                서론부터 결론까지, AI와 함께 논리적 완결성을 확보하는 마법 같은 경험을 선사합니다.
              </p>
            </div>
            {/* 카카오톡 오픈채팅 링크 연결 */}
            <a href="https://open.kakao.com/o/sv0klZji" target="_blank" rel="noopener noreferrer" className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-5 rounded-2xl font-black text-xl transition-all hover:-translate-y-1 shadow-2xl shadow-indigo-600/40 whitespace-nowrap active:scale-95 inline-block">
              수강 신청하기
            </a>
          </div>
          {/* Graphic Element in Banner */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 blur-3xl rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 blur-2xl rounded-full -ml-16 -mb-16"></div>
        </div>

        {/* Footer Section */}
        <div className="text-center pt-10 border-t border-slate-100">
          <div className="flex items-center justify-center gap-2 mb-6 opacity-40">
            <div className="h-[1px] w-12 bg-slate-400"></div>
            <span className="text-xs font-bold tracking-[0.3em] uppercase text-slate-600">Organizer</span>
            <div className="h-[1px] w-12 bg-slate-400"></div>
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">한국AI교육협회</h2>
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-slate-500 font-medium">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              010-4009-0191
            </div>
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              01040090191@daum.net
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
