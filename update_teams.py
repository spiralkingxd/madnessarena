import re
filepath = 'C:/Users/Administrator/Downloads/Madness Arena - Site/app/teams/actions.ts'
with open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

new_logic = '''  // Puxar configurações de sistema para o tamanho máximo da equipe
  const { data: sysSettings } = await supabase
    .from("system_settings")
    .select("tournament")
    .eq("id", 1)
    .maybeSingle();

  const maxTeamSize = Number((sysSettings?.tournament as any)?.max_team_size ?? 5);

  const rawMemberIds: string[] = [];
  for (const val of formData.getAll("member_id")) {
    if (typeof val === "string" && val) rawMemberIds.push(val);
  }

  if (rawMemberIds.length > maxTeamSize - 1) {
    return { error: `Você pode adicionar no máximo ${maxTeamSize - 1} membros nesta equipe.` };
  }'''

text = re.sub(
    r'  const rawMemberIds: string\[\] = \[\];\s*for \(const val of formData\.getAll\(\"member_id\"\)\) \{\s*if \(typeof val === \"string\" && val\) rawMemberIds\.push\(val\);\s*\}',
    new_logic,
    text,
    flags=re.DOTALL
)

new_insert = '''  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({
      name,
      logo_url: logo_url || null,
      captain_id: user.id,
      max_members: maxTeamSize,
    })'''

text = re.sub(
    r'  const \{ data: team, error: teamError \} = await supabase\s*\.from\(\"teams\"\)\s*\.insert\(\{\s*name,\s*logo_url: logo_url \|\| null,\s*captain_id: user\.id,\s*\}\)',
    new_insert,
    text,
    flags=re.DOTALL
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(text)
print('Updated actions.ts!')