import { supabase } from "./config/supabase.js";
import * as colors from "colorette";
import bcrypt from "bcryptjs";
import { users, books } from "./data.js";

const importData = async () => {
  try {
    // 1. Wipe Existing Data
    await supabase.from("transactions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("books").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("users").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 2. Insert Users
    const hashedUsers = await Promise.all(
      users.map(async (u) => {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(u.password, salt);
        return {
          name: u.name,
          email: u.email,
          password: hashedPassword,
          is_admin: u.isAdmin,
        };
      })
    );

    const { data: createdUsers, error: userError } = await supabase
      .from("users")
      .insert(hashedUsers)
      .select();

    if (userError) throw new Error("Users Failed: " + userError.message);

    const adminUser = createdUsers.find((u) => u.is_admin);

    // 3. Insert Books
    const mappedBooks = books.map((b) => ({
      title: b.title,
      author: b.author,
      image: b.image,
      category: b.category,
      description: b.description,
      price_per_day: b.pricePerDay,
      count_in_stock: b.countInStock,
      user_id: adminUser.id,
    }));

    const { error: bookError } = await supabase.from("books").insert(mappedBooks);
    if (bookError) throw new Error("Books Failed: " + bookError.message);

    console.log(colors.green("Data Imported!"));
    process.exit();
  } catch (error) {
    console.error(colors.red(`Error: ${error.message}`));
    process.exit(1);
  }
};

const destroyData = async () => {
  try {
    await supabase.from("transactions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("books").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("users").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    console.log(colors.red("Data Destroyed!"));
    process.exit();
  } catch (error) {
    console.error(colors.red(`Error: ${error.message}`));
    process.exit(1);
  }
};

if (process.argv[2] === "-d") {
  destroyData();
} else {
  importData();
}
