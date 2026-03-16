import re

with open('components/profile-settings-form.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Substituir o <select> do boat_role por checkboxes

old_select = '''<div>
          <label className="block text-sm font-medium text-white mb-2">
            {dict.profileSettings.form.boatRole}
          </label>
          <div className="relative">
            <select
              name="boat_role"
              defaultValue={profile.boat_role || ""}
              className={cn(
                "w-full bg-[#1a1f2e] border-2 text-white px-4 py-3 rounded-xl appearance-none",
                "focus:outline-none focus:border-[#a00000] focus:ring-1 focus:ring-[#a00000]",
                "transition-all duration-300",
                errors?.boat_role
                  ? "border-red-500"
                  : "border-[#2a3142] hover:border-[#3a4152]"
              )}
            >
              <option value="">
                {dict.profileSettings.form.boatRolePlaceholder}
              </option>
              <option value="Timoneiro">Timoneiro</option>
              <option value="Reparo">Reparo</option>
              <option value="Ponteiro">Ponteiro</option>
              <option value="Suporte">Suporte</option>
              <option value="Canhoneiro">Canhoneiro</option>
              <option value="Flex">Flex</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
          {errors?.boat_role && (
            <p className="mt-2 text-sm text-red-400 font-medium flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-red-400" />
              {errors.boat_role[0]}
            </p>
          )}
        </div>'''

new_checkboxes = '''<div>
          <label className="block text-sm font-medium text-white mb-2">
            {dict.profileSettings.form.boatRole}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {["Timoneiro", "Reparo", "Ponteiro", "Suporte", "Canhoneiro", "Flex"].map((role) => {
              // Verifica se a string atual no banco contém esse role
              const currentRoles = (profile.boat_role || "").split(",").map(r => r.trim());
              return (
                <label key={role} className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      name="boat_role_array"
                      value={role}
                      defaultChecked={currentRoles.includes(role)}
                      className={cn(
                        "peer appearance-none w-5 h-5 border-2 rounded",
                        "bg-[#1a1f2e] cursor-pointer transition-all duration-200",
                        errors?.boat_role
                          ? "border-red-500"
                          : "border-[#2a3142] group-hover:border-[#3a4152]",
                        "checked:bg-[#a00000] checked:border-[#a00000]"
                      )}
                    />
                    <svg
                      className="absolute w-3.5 h-3.5 pointer-events-none opacity-0 peer-checked:opacity-100 text-white transition-opacity duration-200"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      stroke="currentColor"
                      strokeWidth="1"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-300 group-hover:text-white transition-colors duration-200">
                    {role}
                  </span>
                </label>
              );
            })}
          </div>
          {errors?.boat_role && (
            <p className="mt-2 text-sm text-red-400 font-medium flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-red-400" />
              {errors.boat_role[0]}
            </p>
          )}
        </div>'''

text = text.replace(old_select, new_checkboxes)

with open('components/profile-settings-form.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

with open('app/actions/profile-actions.ts', 'r', encoding='utf-8') as f:
    actions = f.read()

# Modificar a action para juntar os checkboxes
actions = actions.replace('const formDataObject = Object.fromEntries(formData.entries());', 'const formDataObject = Object.fromEntries(formData.entries());\n    const boatRoles = formData.getAll("boat_role_array");\n    if (boatRoles.length > 0) {\n      formDataObject.boat_role = boatRoles.join(", ");\n    } else {\n      formDataObject.boat_role = "";\n    }')

with open('app/actions/profile-actions.ts', 'w', encoding='utf-8') as f:
    f.write(actions)

print('done roles')
