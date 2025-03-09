import { useState } from "react";

const Comments = () => {
  const [comments, setComments] = useState<string[]>([]);
  const [newComment, setNewComment] = useState("");

  const handleAddComment = () => {
    if (newComment.trim() !== "") {
      setComments([...comments, newComment]);
      setNewComment("");
    }
  };

  return (
    <div className="min-w-[350px] max-w-[355px] bg-blue-50 rounded-lg shadow-lg p-4 flex flex-col max-h-screen mb-12">
      <h2 className="mb-4 text-xl font-semibold text-gray-800">Комментарии</h2>

      {/* Список комментариев */}
      <div className="overflow-y-auto flex-1 mb-4 space-y-3">
        {comments.map((comment, index) => (
          <div
            key={index}
            className="overflow-hidden p-3 break-words bg-white rounded-lg shadow-sm"
          >
            <p className="text-gray-700">{comment}</p>
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
        <button
          onClick={handleAddComment}
          className="px-4 py-2 text-white bg-blue-500 rounded-lg transition-colors duration-200 hover:bg-blue-600"
        >
          Отправить
        </button>
      </div>
    </div>
  );
};

export { Comments };
