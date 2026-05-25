import { useAuth } from "@/hooks/useAuth";

const AuthenticateStorage = () => {
  const { user, login, logout, MOCK_USERS } = useAuth();

  if (!user) {
    return (
      <div className="w-xl mx-auto! flex justify-center flex-col items-center p-6 rounded-lg bg-gray-100 shadow-md shadow-gray-500">
        <h2 className="text-xl font-bold uppercase">Please Log In</h2>
        {MOCK_USERS.map((u) => (
          <button
            key={u.id}
            onClick={() => login(u.id)}
            className="min-w-md px-6 uppercase my-1 py-3 bg-sky-500 hover:bg-sky-600 text-white font-md font-semibold rounded-lg transition duration-200 cursor-pointer m-2"
          >
            Log in as {u.name} ({u.role})
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="w-sm mx-auto! flex justify-center p-6 rounded-lg bg-gray-100 shadow-md shadow-gray-500">
      <div className="">
        <h2 className="text-2xl font-bold uppercase">Welcome, {user.name}!</h2>
        <p className="text-1xl font-bold uppercase divide-x">
          Your role: {user.role}
        </p>

        <button
          onClick={logout}
          className="px-6! py-2! bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-md transition duration-200 cursor-pointer m-2"
        >
          Log Out
        </button>
      </div>
    </div>
  );
};

export default AuthenticateStorage;
