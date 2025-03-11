import React, { useEffect, useState } from "react";
import { Comment, SiteInfo, useAddCommentMutation } from "@/api/api";
import { useParams } from "react-router-dom";

interface Props {
  data: SiteInfo | null | undefined;
}


const Comments: React.FC<Props> = ({ data }) => {
  const { stationId } = useParams<Record<string, string | undefined>>();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [typeFailure, setTypeFailure] = useState<string | null>(null);
  const [addComment] = useAddCommentMutation();

  useEffect(() => {
    if (data && data.comment) {
      setComments(data.comment);
    }
  }, [data]);

  const handleAddComment = async () => {
    if (newComment.trim() !== "" && status && stationId) { 
      const comment: Comment = {
        comment: newComment,
        date: new Date().toISOString(),
        site_name: stationId, 
        status: status,
        type_: null, 
        type_a: null, 
        type_failure: typeFailure,
      };
  
      try {
        if (stationId) {
          await addComment({ base: stationId, comment }).unwrap();
          setComments((prevComments) => [...prevComments, comment]);
          setNewComment("");
          setStatus(null);
          setTypeFailure(null);
        } else {
          console.error("stationId не определен");
        }
      } catch (error) {
        console.error("Ошибка при добавлении комментария:", error);
      }
    }
  };

  return (
    <div className="min-w-[350px] max-w-[355px] bg-blue-50 rounded-lg shadow-lg p-4 flex flex-col max-h-screen mb-12">
      <h2 className="mb-4 text-xl font-semibold text-gray-800">Комментарии</h2>
  
      {/* Список комментариев */}
      <div className="flex-1 mb-4 space-y-3 overflow-y-auto">
        {comments.map((comment, index) => (
          <div
            key={index}
            className="p-3 overflow-hidden break-words bg-white rounded-lg shadow-sm"
          >
            <p className="text-gray-700">{comment.comment}</p>
            <p className="text-sm text-gray-500">{comment.date}</p>
            <p className="text-xs text-gray-500">{comment.type_failure}</p>
            <p className="text-xs text-gray-500">{comment.status}</p>
          </div>
        ))}
      </div>
  
      {/* Поле для ввода нового комментария */}
      <div className="flex flex-col gap-2">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Напишите комментарий..."
          className="flex-1 p-2 max-w-full rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[120px] dark:bg-gray-700 dark:text-gray-200"
          rows={1}
        />
        
        {/* Выбор статуса */}
        <select
          value={status || ""}
          onChange={(e) => setStatus(e.target.value || null)}
          className="p-2 border border-gray-300 rounded-lg"
        >
          <option value="">Выберите статус</option>
          <option value="решена">Решена</option>
          <option value="в работе">В работе</option>
        </select>
  
        {/* Выбор типа отказа */}
        <select
          value={typeFailure || ""}
          onChange={(e) => setTypeFailure(e.target.value || null)}
          className="p-2 border border-gray-300 rounded-lg"
        >
          <option value="">Выберите тип отказа</option>
          <option value="АКБ">АКБ</option>
          <option value="Транспорт">Транспорт</option>
          <option value="АКБ + транспорт">АКБ + транспорт</option>
          <option value="Иное">Иное</option>
        </select>
  
        <button
          onClick={handleAddComment}
          className="px-4 py-2 text-white transition-colors duration-200 bg-blue-500 rounded-lg hover:bg-blue-600"
        >
          Отправить
        </button>
      </div>
    </div>
  );
  
};

export { Comments };
