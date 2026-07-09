export default function Authorization() {
const register = async (formData: FormData) => {
  'use server';

  const email = formData.get('email');
  const password = formData.get('password');

  console.log(email, password);
};

  return <form action={register}>
    <input type="text" name="email" placeholder="Email" />
    <input type="password" name="password" placeholder="Password" />
    <button type="submit">Register</button>
  </form>;
}
