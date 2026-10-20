import { PROJECT_STATUS_LABEL, STAGES, type Project, type ProjectStatus } from "@/lib/types";

/** 현장 등록·수정 폼의 입력칸. 공개되는 칸과 비공개 칸을 나눠 보여준다. */
export default function ProjectFields({ project }: { project?: Project }) {
  return (
    <div className="space-y-5">
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-bold text-muted">현장 정보 (포트폴리오·공유 페이지에 보임)</legend>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="title">현장 이름</label>
          <input id="title" name="title" className="input" defaultValue={project?.title} placeholder="옥정 아파트 32평 화이트 오크" required />
        </div>
        <div>
          <label className="label" htmlFor="dong">공개 지역 (동까지만)</label>
          <input id="dong" name="dong" className="input" defaultValue={project?.dong} placeholder="양주 옥정동" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="area">평수</label>
            <input id="area" name="area" type="number" min={1} className="input" defaultValue={project?.area ?? 32} />
          </div>
          <div>
            <label className="label" htmlFor="style">스타일</label>
            <input id="style" name="style" className="input" defaultValue={project?.style} placeholder="내추럴·우드" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="startDate">착공일</label>
          <input id="startDate" name="startDate" type="date" className="input" defaultValue={project?.startDate} required />
        </div>
        <div>
          <label className="label" htmlFor="endDate">완공일</label>
          <input id="endDate" name="endDate" type="date" className="input" defaultValue={project?.endDate} />
        </div>
        <div>
          <label className="label" htmlFor="status">상태</label>
          <select id="status" name="status" className="input" defaultValue={project?.status ?? "planned"}>
            {(Object.keys(PROJECT_STATUS_LABEL) as ProjectStatus[]).map((s) => (
              <option key={s} value={s}>{PROJECT_STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="currentStage">현재 공정</label>
          <select id="currentStage" name="currentStage" className="input" defaultValue={project?.currentStage ?? ""}>
            <option value="">-</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="summary">소개 글</label>
          <textarea id="summary" name="summary" rows={3} className="input" defaultValue={project?.summary} placeholder="어떤 집을 어떻게 바꿨는지 두세 줄로" />
        </div>
      </fieldset>

      <fieldset className="grid gap-3 rounded-xl bg-paper p-4 sm:grid-cols-2">
        <legend className="sr-only">고객 정보</legend>
        <p className="text-sm font-bold text-muted sm:col-span-2">🔒 고객 정보 (사장님만 봄, 공개 안 됨)</p>
        <div>
          <label className="label" htmlFor="customerName">고객 이름</label>
          <input id="customerName" name="customerName" className="input" defaultValue={project?.customerName} />
        </div>
        <div>
          <label className="label" htmlFor="customerPhone">고객 연락처</label>
          <input id="customerPhone" name="customerPhone" className="input" defaultValue={project?.customerPhone} inputMode="tel" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="address">상세 주소</label>
          <input id="address" name="address" className="input" defaultValue={project?.address} />
        </div>
        <label className="flex items-start gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="portfolioConsent" defaultChecked={project?.portfolioConsent} className="mt-1 accent-[var(--brand)]" />
          <span>
            고객이 사진의 포트폴리오 게시에 동의함 <span className="text-muted">(계약서 동의 항목 확인)</span>
          </span>
        </label>
      </fieldset>
    </div>
  );
}
