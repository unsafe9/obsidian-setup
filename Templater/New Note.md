<%*
const file = tp.file.find_tfile(tp.file.path(true));
const result = await tp.user.relocateNewNote(tp, file);
if (!result) {
    return;
}
const { title, tags } = result;
_%>

---
tags: [<%* tR += tags.join(',') %>]
created: <% tp.file.creation_date('YYYY-MM-DD[T]hh:mm') %>
---

# <%* tR += title %>

