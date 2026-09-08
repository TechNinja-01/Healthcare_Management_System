from app.config.database import SessionLocal

from app.module.role.model import Role as RoleModel
from app.module.Permission.model import Permission
from app.module.rolePermission.model import RolePermission

from app.config.constants import Role, ROLE_PERMISSIONS


def seed_database():

    db = SessionLocal()

    try:

        # -------------------------
        # 1. Create permissions
        # -------------------------

        all_permissions = set()

        for permission_list in ROLE_PERMISSIONS.values():
            all_permissions.update(permission_list)

        permission_map = {}

        for permission_name in all_permissions:

            permission = (
                db.query(Permission)
                .filter(
                    Permission.name == permission_name
                )
                .first()
            )

            if not permission:

                permission = Permission(
                    name=permission_name
                )

                db.add(permission)
                db.flush()

            permission_map[permission_name] = permission


        # -------------------------
        # 2. Create roles
        # -------------------------

        role_map = {}

        for role_enum in Role:

            role = (
                db.query(RoleModel)
                .filter(
                    RoleModel.name == role_enum.value
                )
                .first()
            )

            if not role:

                role = RoleModel(
                    name=role_enum.value
                )

                db.add(role)
                db.flush()

            role_map[role_enum] = role


        # -------------------------
        # 3. Create relationships
        # -------------------------

        for role_enum, permission_names in ROLE_PERMISSIONS.items():

            role = role_map[role_enum]

            for permission_name in permission_names:

                permission = permission_map[
                    permission_name
                ]

                existing = (
                    db.query(RolePermission)
                    .filter(
                        RolePermission.role_id
                        == role.id,
                        RolePermission.permission_id
                        == permission.id,
                    )
                    .first()
                )

                if not existing:

                    role_permission = RolePermission(
                        role_id=role.id,
                        permission_id=permission.id,
                    )

                    db.add(role_permission)


        db.commit()

        print(
            "Roles and permissions seeded successfully!"
        )


    except Exception as e:

        db.rollback()

        print(
            "Seeding failed:",
            e
        )

        raise

    finally:

        db.close()


if __name__ == "__main__":
    seed_database()