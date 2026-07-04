BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] INT NOT NULL IDENTITY(1,1),
    [email] NVARCHAR(1000) NOT NULL,
    [passwordHash] NVARCHAR(1000) NOT NULL,
    [muted] BIT NOT NULL CONSTRAINT [User_muted_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[Session] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] INT NOT NULL,
    [expiresAt] DATETIME2 NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Session_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Session_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[LevelProgress] (
    [userId] INT NOT NULL,
    [levelId] NVARCHAR(1000) NOT NULL,
    [stars] INT NOT NULL,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [LevelProgress_pkey] PRIMARY KEY CLUSTERED ([userId],[levelId])
);

-- CreateTable
CREATE TABLE [dbo].[DailyResult] (
    [id] INT NOT NULL IDENTITY(1,1),
    [userId] INT NOT NULL,
    [date] NVARCHAR(1000) NOT NULL,
    [won] BIT NOT NULL,
    [livesLeft] INT NOT NULL,
    [stars] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DailyResult_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [DailyResult_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [DailyResult_userId_date_key] UNIQUE NONCLUSTERED ([userId],[date])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Session_userId_idx] ON [dbo].[Session]([userId]);

-- AddForeignKey
ALTER TABLE [dbo].[Session] ADD CONSTRAINT [Session_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[LevelProgress] ADD CONSTRAINT [LevelProgress_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[DailyResult] ADD CONSTRAINT [DailyResult_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
