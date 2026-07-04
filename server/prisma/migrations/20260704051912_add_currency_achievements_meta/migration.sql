BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[User] ADD [currency] INT NOT NULL CONSTRAINT [User_currency_df] DEFAULT 0;

-- CreateTable
CREATE TABLE [dbo].[UserAchievement] (
    [userId] INT NOT NULL,
    [achievementId] NVARCHAR(1000) NOT NULL,
    [unlockedAt] DATETIME2 NOT NULL CONSTRAINT [UserAchievement_unlockedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [UserAchievement_pkey] PRIMARY KEY CLUSTERED ([userId],[achievementId])
);

-- CreateTable
CREATE TABLE [dbo].[MetaUpgrade] (
    [userId] INT NOT NULL,
    [upgradeId] NVARCHAR(1000) NOT NULL,
    [tier] INT NOT NULL,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [MetaUpgrade_pkey] PRIMARY KEY CLUSTERED ([userId],[upgradeId])
);

-- AddForeignKey
ALTER TABLE [dbo].[UserAchievement] ADD CONSTRAINT [UserAchievement_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[MetaUpgrade] ADD CONSTRAINT [MetaUpgrade_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
