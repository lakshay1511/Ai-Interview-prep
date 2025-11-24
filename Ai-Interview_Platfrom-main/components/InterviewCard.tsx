import { getRandomInterviewCover } from "@/lib/utils";
import dayjs from "dayjs";
import Image from "next/image";
import { Button } from "./ui/button";
import Link from "next/link";
import DisplayTechIcons from "./DisplayTechIcons";
import { getFeedbackByInterviewId } from "@/lib/actions/general.action";

const InterviewCard = async ({
  id,
  userId,
  role,
  type,
  techstack,
  createdAt,
}: InterviewCardProps) => {
  const feedback =
    userId && id
      ? await getFeedbackByInterviewId({ interviewId: id, userId })
      : null;
  const normalizedType = /mix/gi.test(type) ? "Mixed" : type;

  const formattedDate = dayjs(
    feedback?.createdAt || createdAt || Date.now()
  ).format("MMM D, YYYY");

  return (
    <div className="relative w-[360px] max-sm:w-full min-h-96 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/20 group blue-gradient-dark rounded-2xl border border-[#23243a] overflow-hidden">
      {/* Content */}
      <div className="relative p-7 flex flex-col justify-between h-full z-10">
        {/* Enhanced Badge */}
        <div className="absolute top-0 right-0 w-fit px-4 py-2 rounded-bl-lg bg-gradient-to-r from-transparent to-white/15">
          <p className="uppercase font-semibold text-xs">{normalizedType}</p>
        </div>

        {/* Enhanced Cover Image with floating effect */}
        <div className="flex justify-center -mt-6 mb-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/30 to-purple-500/30 blur-md animate-pulse"></div>
            <div className="relative rounded-full bg-gradient-to-r from-white/20 to-white/10 p-1 shadow-2xl border border-white/30 backdrop-blur-sm">
              <Image
                src={getRandomInterviewCover()}
                alt="cover"
                width={85}
                height={85}
                className="rounded-full object-cover size-[85px] transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 shadow-lg"
              />
            </div>
          </div>
        </div>

        {/* Enhanced Title */}
        <h3 className="mt-2 mb-3 text-center text-xl font-bold capitalize text-white tracking-wide drop-shadow-lg">
          <span className="bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">
            {role}
          </span>{" "}
          Interview
        </h3>

        {/* Enhanced Info Row */}
        <div className="flex flex-row gap-6 justify-center mt-2 mb-4">
          <div className="flex flex-row gap-2 items-center text-gray-200 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/20">
            <Image src="/calendar.svg" alt="calendar" width={16} height={16} />
            <p className="text-sm font-medium">{formattedDate}</p>
          </div>
          <div className="flex flex-row gap-2 items-center text-gray-200 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/20">
            <Image src="/star.svg" alt="star" width={16} height={16} />
            <p className="text-sm font-medium">
              {feedback?.totalScore || "---"}/100
            </p>
          </div>
        </div>

        {/* Enhanced Assessment */}
        <div className="bg-white/5 rounded-lg p-4 backdrop-blur-sm border border-white/10 mb-4">
          <p className="line-clamp-2 text-center text-gray-100 text-[15px] min-h-[40px] leading-relaxed">
            {feedback?.finalAssessment ||
              "You haven't taken this interview yet. Take it now to improve your skills!"}
          </p>
        </div>

        {/* Fixed Tech icons and button layout */}
        <div className="flex flex-row justify-between items-end mt-auto gap-4">
          <div className="flex-shrink-0 max-w-[120px] overflow-hidden pb-2">
            <DisplayTechIcons techstack={techstack} />
          </div>
          <Button className="btn-primary relative overflow-hidden transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30 active:scale-95 group/btn">
            {/* Animated background overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/80 to-purple-600/80 opacity-0 group-hover/btn:opacity-100 transition-all duration-300 ease-out"></div>

            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 ease-out"></div>

            <Link
              href={feedback ? `/interview/${id}/feedback` : `/interview/${id}`}
              className="relative w-full h-full flex items-center justify-center text-center font-semibold text-black transition-all duration-300 group-hover/btn:text-white group-hover/btn:drop-shadow-lg"
            >
              {feedback ? "View Feedback" : "Take Interview"}
            </Link>
          </Button>
        </div>
      </div>

      {/* Hover glow effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-blue-500/0 group-hover:from-blue-500/10 group-hover:via-purple-500/10 group-hover:to-blue-500/10 transition-all duration-500 pointer-events-none"></div>
    </div>
  );
};

export default InterviewCard;
