SELECT email, prenom, nom, r.name AS role, "keycloakId"
FROM "Utilisateur" u
LEFT JOIN "Role" r ON r."idRole" = u."roleId";
